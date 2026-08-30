import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface OrderStatusEvent {
  orderId: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'PAYMENT_FAILED';
  message?: string;
  updatedAt: string;
}

@Injectable()
export class OrdersSSEService {
  private readonly logger = new Logger(OrdersSSEService.name);
  private readonly events$ = new Subject<OrderStatusEvent>();

  emitStatusUpdate(event: OrderStatusEvent) {
    this.logger.log(`Disparando atualização SSE para Pedido ${event.orderId}: Status = ${event.status}`);
    this.events$.next(event);
  }

  getStreamForOrder(orderId: string): Observable<{ data: OrderStatusEvent }> {
    return this.events$.asObservable().pipe(
      filter((event) => event.orderId === orderId),
      map((event) => ({ data: event }))
    );
  }
}
