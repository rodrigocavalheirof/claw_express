import { Injectable, Logger } from '@nestjs/common';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  idempotencyKey: string;
}

export interface PaymentResponse {
  transactionId: string;
  status: 'APPROVED' | 'REJECTED';
  reason?: string;
  latencyMs: number;
}

@Injectable()
export class PaymentGatewayMock {
  private readonly logger = new Logger(PaymentGatewayMock.name);

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Simula a latência descrita no contexto (de 2 a 10 segundos)
    const latencyMs = Math.floor(Math.random() * 8000) + 2000;
    this.logger.log(
      `[Gateway Mock] Iniciando processamento do pedido ${request.orderId} (${request.amount} BRL). Latência simulada: ${latencyMs}ms...`
    );

    await new Promise((resolve) => setTimeout(resolve, latencyMs));

    // Simula taxa de falha de 20%
    const isFailure = Math.random() < 0.20;

    if (isFailure) {
      this.logger.warn(`[Gateway Mock] FALHA simulada de pagamento para o pedido ${request.orderId}! (Taxa 20%)`);
      throw new Error('Instabilidade temporária na operadora de cartão de crédito. Transação negada.');
    }

    this.logger.log(`[Gateway Mock] SUCESSO! Pagamento APROVADO para o pedido ${request.orderId}.`);
    return {
      transactionId: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'APPROVED',
      latencyMs,
    };
  }
}
