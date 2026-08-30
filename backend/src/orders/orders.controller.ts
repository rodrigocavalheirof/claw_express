import { Controller, Post, Get, Body, Param, Sse, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersSSEService } from './orders.sse.service';
import { Observable } from 'rxjs';
import { Response } from 'express';

@Controller('api/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly sseService: OrdersSSEService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.createOrder(createOrderDto);
    return {
      message: 'Pedido recebido com sucesso. Processamento de pagamento iniciado em segundo plano.',
      orderId: order.id,
      status: order.status,
      totalAmount: order.total_amount,
      idempotencyKey: order.idempotency_key,
    };
  }

  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Sse(':id/stream')
  streamOrderStatus(@Param('id') id: string): Observable<{ data: any }> {
    return this.sseService.getStreamForOrder(id);
  }
}
