import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface Response<T> {
  data: T;
  meta: {
    timestamp: string;
    path: string;
    method: string;
    statusCode: number;
    message?: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    
    return next.handle().pipe(
      map((data) => {
        // If the response already has a message property, use it
        const message = data?.message || this.getDefaultMessage(request.method);
        
        // If data already has our expected structure, return it as-is
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return data;
        }

        return {
          data: data,
          meta: {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            statusCode: response.statusCode,
            message,
          },
        };
      }),
    );
  }

  private getDefaultMessage(method: string): string {
    const messages = {
      GET: 'Data retrieved successfully',
      POST: 'Resource created successfully',
      PUT: 'Resource updated successfully',
      PATCH: 'Resource updated successfully',
      DELETE: 'Resource deleted successfully',
    };
    
    return messages[method] || 'Operation completed successfully';
  }
}
