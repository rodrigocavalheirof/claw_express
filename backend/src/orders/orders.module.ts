import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersSSEService } from './orders.sse.service';
import { PaymentModule } from '../payments/payment.module';

@Module({
  imports: [forwardRef(() => PaymentModule)],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersSSEService,
    {
      provide: 'PAYMENT_QUEUE',
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        return new Queue('payment-queue', {
          connection: { host, port },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [OrdersService, OrdersSSEService],
})
export class OrdersModule {}
