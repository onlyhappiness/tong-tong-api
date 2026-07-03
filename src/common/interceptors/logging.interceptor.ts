import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const now = Date.now();
    const method = req.method;
    const url = req.url;

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const delay = Date.now() - now;
        console.log(`${method} ${url} ${statusCode} ${delay}ms`);
      }),
      catchError((error) => {
        const delay = Date.now() - now;
        const statusCode = error.getStatus ? error.getStatus() : 500;
        const errorMessage = error.message || 'Internal server error';
        const errorResponse = error.response
          ? JSON.stringify(error.response)
          : '';

        console.log(
          `${method} ${url} ${statusCode} ${delay}ms - Error: ${errorMessage} - Details: ${errorResponse}`,
        );
        return throwError(() => error);
      }),
    );
  }
}
