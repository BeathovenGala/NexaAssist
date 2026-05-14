import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccess<unknown>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data: data === undefined ? null : data,
        meta: {},
      })),
    );
  }
}
