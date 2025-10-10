import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const userAgent = request.get('User-Agent') || '';
    const ip = request.ip;

    const now = Date.now();
    
    // Log request
    this.logger.log(
      `${method} ${url} - ${userAgent} ${ip} - Request: ${JSON.stringify(body)}`
    );

    return next
      .handle()
      .pipe(
        tap((data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - now;
          
          // Log response
          this.logger.log(
            `${method} ${url} - ${statusCode} - ${duration}ms - Response: ${JSON.stringify(data)}`
          );
        })
      );
  }
}
