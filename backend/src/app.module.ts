import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { RolesModule } from './roles/roles.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AvailabilityModule } from './availability/availability.module';
import { CalendarModule } from './calendar/calendar.module';
import { ServiceTypesModule } from './service-types/service-types.module';
import { JoinRequestsModule } from './join-requests/join-requests.module';
import { InventoryModule } from './inventory/inventory.module';
import { QueuesModule } from './queues/queues.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventsModule } from './events/events.module';
import { OperationsModule } from './operations/operations.module';
import { ChatModule } from './chat/chat.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { SeoModule } from './seo/seo.module';
import { AnalyticsInsightsModule } from './analytics-insights/analytics.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

import { StorageModule } from './common/storage/storage.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get('THROTTLE_TTL_MS') ?? 60_000),
          limit: Number(config.get('THROTTLE_LIMIT') ?? 120),
        },
      ],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { singleLine: true, colorize: true },
              }
            : undefined,
      },
    }),
    StorageModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    TenantsModule,
    RolesModule,
    InvitationsModule,
    ServiceTypesModule,
    AvailabilityModule,
    AppointmentsModule,
    CalendarModule,
    JoinRequestsModule,
    InventoryModule,
    QueuesModule,
    NotificationsModule,
    EventsModule,
    OperationsModule,
    ChatModule,
    AnalyticsInsightsModule,
    CampaignsModule,
    WhatsAppModule,
    SeoModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
