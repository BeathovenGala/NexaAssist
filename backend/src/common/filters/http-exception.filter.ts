import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorBody {
  success: false;
  message: string;
  errors: unknown[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string) ?? exception.message;
        if (Array.isArray(body.message)) {
          message = 'Validation failed';
          errors = body.message;
        }
        if (body.errors && Array.isArray(body.errors)) {
          errors = body.errors;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        { err: exception },
        'Unhandled error in request pipeline',
      );
    } else {
      this.logger.error({ exception }, 'Unknown exception type');
    }

    const body: ErrorBody = {
      success: false,
      message,
      errors,
    };
    response.status(status).json(body);
  }
}
