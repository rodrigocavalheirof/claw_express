import { Module, forwardRef } from '@nestjs/common';
import { PaymentGatewayMock } from './payment.gateway.mock';
import { PaymentWorker } from './payment.worker';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [PaymentGatewayMock, PaymentWorker],
  exports: [PaymentGatewayMock],
})
export class PaymentModule {}
