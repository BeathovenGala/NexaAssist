import {
  Controller,
  Get,
  HttpCode,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  @HttpCode(200)
  async check() {
    const result = await this.health.check();
    if (result.status === 'degraded') {
      throw new ServiceUnavailableException({
        message: 'Service degraded',
        checks: result.checks,
        workerOnline: result.workerOnline,
        errors: result.errors,
      });
    }
    return result;
  }
}
