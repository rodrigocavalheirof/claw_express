import { Injectable, BadRequestException, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { v4 as uuidv4 } from 'uuid';
import { Queue } from 'bullmq';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'PAYMENT_FAILED';
  total_amount: number;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly db: DatabaseService,
    @Inject('PAYMENT_QUEUE') private readonly paymentQueue: Queue,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    const { customerName, customerEmail, idempotencyKey, items } = createOrderDto;

    // 1. Idempotência: Checar se o pedido com essa chave já foi criado previamente
    const existingOrder = await this.findByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      this.logger.log(`Pedido idempotente detectado para a chave ${idempotencyKey}. Retornando pedido existente ${existingOrder.id}`);
      return existingOrder;
    }

    // 2. Executar Transação ACID com Lock Pessimista (SELECT ... FOR UPDATE) no Estoque
    const order = await this.db.transaction(async (client) => {
      let totalAmount = 0;
      const orderItemsToInsert: {
        id: string;
        productId: string;
        productName: string;
        unitPrice: number;
        quantity: number;
        subtotal: number;
      }[] = [];

      for (const item of items) {
        // Bloqueio pessimista da linha do produto para prevenir Race Condition
        const productRes = await client.query(
          'SELECT id, name, price::float, stock_quantity FROM products WHERE id = $1 FOR UPDATE',
          [item.productId]
        );

        if (productRes.rows.length === 0) {
          throw new NotFoundException(`Produto ${item.productId} não foi encontrado.`);
        }

        const product = productRes.rows[0];

        if (product.stock_quantity < item.quantity) {
          throw new BadRequestException(
            `Estoque insuficiente para o produto '${product.name}'. Disponível: ${product.stock_quantity}, Solicitado: ${item.quantity}`
          );
        }

        // Imutabilidade: Captura (snapshot) do preço atual no momento da compra
        const unitPrice = parseFloat(product.price);
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;

        // Deduz estoque atomicamente dentro da transação
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, item.productId]
        );

        orderItemsToInsert.push({
          id: uuidv4(),
          productId: product.id,
          productName: product.name,
          unitPrice,
          quantity: item.quantity,
          subtotal,
        });
      }

      // Criar Registro do Pedido (Status Inicial: PENDING_PAYMENT)
      const orderId = uuidv4();
      const orderRes = await client.query<Order>(
        `INSERT INTO orders (id, customer_name, customer_email, status, total_amount, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, customer_name, customer_email, status, total_amount::float, idempotency_key, created_at, updated_at`,
        [orderId, customerName, customerEmail, 'PENDING_PAYMENT', totalAmount, idempotencyKey]
      );

      const createdOrder = orderRes.rows[0];

      // Inserir itens com preço congelado (Imutabilidade)
      for (const item of orderItemsToInsert) {
        await client.query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.id, orderId, item.productId, item.productName, item.unitPrice, item.quantity, item.subtotal]
        );
      }

      return createdOrder;
    });

    // 3. Enviar Job para Fila do BullMQ para processamento em background de forma assíncrona
    await this.paymentQueue.add(
      'process-payment',
      {
        orderId: order.id,
        amount: order.total_amount,
        idempotencyKey,
      },
      {
        attempts: 4, // Tentativa 1 imediata + 3 retentativas
        backoff: {
          type: 'exponential',
          delay: 3000, // Retentativas com atraso de 3s, 6s, 12s...
        },
        removeOnComplete: true,
      }
    );

    this.logger.log(`Pedido ${order.id} criado com sucesso. Job de pagamento adicionado à fila com idempotencyKey: ${idempotencyKey}`);
    return order;
  }

  async findById(id: string): Promise<Order> {
    const orderRes = await this.db.query<Order>(
      'SELECT id, customer_name, customer_email, status, total_amount::float, idempotency_key, created_at, updated_at FROM orders WHERE id = $1',
      [id]
    );

    if (orderRes.rows.length === 0) {
      throw new NotFoundException(`Pedido com ID ${id} não foi encontrado.`);
    }

    const order = orderRes.rows[0];

    const itemsRes = await this.db.query<OrderItem>(
      'SELECT id, order_id, product_id, product_name, unit_price::float, quantity, subtotal::float FROM order_items WHERE order_id = $1',
      [id]
    );

    order.items = itemsRes.rows;
    return order;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Order | null> {
    const res = await this.db.query<Order>(
      'SELECT id, customer_name, customer_email, status, total_amount::float, idempotency_key, created_at, updated_at FROM orders WHERE idempotency_key = $1',
      [idempotencyKey]
    );
    if (res.rows.length === 0) return null;
    const order = res.rows[0];
    const itemsRes = await this.db.query<OrderItem>(
      'SELECT id, order_id, product_id, product_name, unit_price::float, quantity, subtotal::float FROM order_items WHERE order_id = $1',
      [order.id]
    );
    order.items = itemsRes.rows;
    return order;
  }

  async updateOrderStatus(id: string, status: 'PAID' | 'PAYMENT_FAILED'): Promise<void> {
    await this.db.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
    this.logger.log(`Status do Pedido ${id} atualizado para ${status}`);
  }

  async releaseOrderStock(orderId: string): Promise<void> {
    const itemsRes = await this.db.query<OrderItem>(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );

    await this.db.transaction(async (client) => {
      for (const item of itemsRes.rows) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
    });

    this.logger.log(`Estoque do pedido ${orderId} devolvido com sucesso (compensação).`);
  }
}
