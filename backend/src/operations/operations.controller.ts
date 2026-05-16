import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { AuthUser } from '../types/auth-user';
import { OperationsService } from './operations.service';

@Controller('operations')
@UseGuards(RolesGuard, PermissionsGuard)
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('health')
  @RequirePermissions('operations:read')
  health(@CurrentUser() actor: AuthUser) {
    return this.operations.getHealth(actor);
  }

  @Get('jobs/failed')
  @RequirePermissions('operations:read')
  listFailed(@CurrentUser() actor: AuthUser, @Query('take') take?: string) {
    return this.operations.listAllFailed(actor, take ? Number(take) : 10);
  }

  @Get('queues/:queueName/jobs/failed')
  @RequirePermissions('operations:read')
  listQueueFailed(
    @CurrentUser() actor: AuthUser,
    @Param('queueName') queueName: string,
    @Query('take') take?: string,
  ) {
    return this.operations.listFailedJobs(
      actor,
      queueName,
      take ? Number(take) : 25,
    );
  }

  @Post('queues/:queueName/jobs/:jobId/retry')
  @RequirePermissions('operations:read')
  retry(
    @CurrentUser() actor: AuthUser,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ) {
    return this.operations.retryJob(actor, queueName, jobId);
  }
}
