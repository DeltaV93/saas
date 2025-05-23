import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    AuthModule,
    PaymentModule,
    NotificationModule,
    DashboardModule,
    AdminModule,
    HealthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
