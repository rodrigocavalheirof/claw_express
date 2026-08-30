import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { PaymentGatewayMock } from './payment.gateway.mock';
import { OrdersService } from '../orders/orders.service';
import { OrdersSSEService } from '../orders/orders.sse.service';
import { DatabaseService } from '../database/database.service';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentJobPayload {
  orderId: string;
  amount: number;
  idempotencyKey: string;
}

@Injectable()
export class PaymentWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentWorker.name);
  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentGateway: PaymentGatewayMock,
    private readonly ordersService: OrdersService,
    private readonly sseService: OrdersSSEService,
    private readonly db: DatabaseService,
  ) {}

  onModuleInit() {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    this.worker = new Worker<PaymentJobPayload>(
      'payment-queue',
      async (job: Job<PaymentJobPayload>) => {
        await this.handlePaymentJob(job);
      },
      {
        connection: {
          host: redisHost,
          port: redisPort,
        },
        concurrency: 5,
      }
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} para o pedido ${job?.data?.orderId} falhou (Tentativa ${job?.attemptsMade}/${job?.opts?.attempts}): ${err.message}`);
    });

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} concluído com sucesso.`);
    });

    this.logger.log('Worker do BullMQ para processamento de pagamentos iniciado.');
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Worker do BullMQ encerrado.');
    }
  }

  private async handlePaymentJob(job: Job<PaymentJobPayload>) {
    const { orderId, amount, idempotencyKey } = job.data;
    const currentAttempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts || 4;

    this.logger.log(`[Worker] Processando pagamento do pedido ${orderId} (Tentativa ${currentAttempt}/${maxAttempts})`);

    // 1. Checagem de Idempotência na tabela de pagamentos
    const paymentCheck = await this.db.query(
      'SELECT id, status FROM payments WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    if (paymentCheck.rows.length > 0 && paymentCheck.rows[0].status === 'APPROVED') {
      this.logger.warn(`[Worker] Pagamento com idempotencyKey '${idempotencyKey}' já foi aprovado anteriormente. Operação ignorada.`);
      return;
    }

    try {
      // 2. Executar chamada à API Mock de Pagamento (Latência 2s-10s, 20% falha)
      const result = await this.paymentGateway.processPayment({ orderId, amount, idempotencyKey });

      // 3. Sucesso: Registrar pagamento aprovado no banco de dados
      await this.db.query(
        `INSERT INTO payments (id, order_id, idempotency_key, status, amount, attempts)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (idempotency_key) DO UPDATE SET status = 'APPROVED', attempts = $6, updated_at = CURRENT_TIMESTAMP`,
        [uuidv4(), orderId, idempotencyKey, 'APPROVED', amount, currentAttempt]
      );

      // 4. Atualizar Status do Pedido para PAGO (PAID)
      await this.ordersService.updateOrderStatus(orderId, 'PAID');

      // 5. Emitir evento SSE em Tempo Real para a interface web React
      this.sseService.emitStatusUpdate({
        orderId,
        status: 'PAID',
        message: 'Pagamento aprovado com sucesso!',
        updatedAt: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`[Worker] Erro no pagamento (Tentativa ${currentAttempt}/${maxAttempts}): ${error.message}`);

      // Registrar ou atualizar histórico de tentativa de pagamento no banco
      await this.db.query(
        `INSERT INTO payments (id, order_id, idempotency_key, status, amount, attempts, error_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (idempotency_key) DO UPDATE SET status = 'REJECTED', attempts = $6, error_reason = $7, updated_at = CURRENT_TIMESTAMP`,
        [uuidv4(), orderId, idempotencyKey, 'REJECTED', amount, currentAttempt, error.message]
      );

      // Se ainda houver retentativas disponíveis, relança o erro para o BullMQ agendar o retry com backoff exponencial
      if (currentAttempt < maxAttempts) {
        throw error;
      }

      // Se todas as retentativas foram esgotadas (Falha Definitiva):
      this.logger.error(`[Worker] Retentativas esgotadas para o pedido ${orderId}. Marcando como PAYMENT_FAILED e liberando estoque.`);

      // 6. Atualizar Status do Pedido para PAYMENT_FAILED
      await this.ordersService.updateOrderStatus(orderId, 'PAYMENT_FAILED');

      // 7. Liberar o estoque reservado previamente (Compensação)
      await this.ordersService.releaseOrderStock(orderId);

      // 8. Emitir evento SSE de Falha para a interface web React
      this.sseService.emitStatusUpdate({
        orderId,
        status: 'PAYMENT_FAILED',
        message: `Falha no processamento do pagamento após ${maxAttempts} tentativas: ${error.message}`,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
