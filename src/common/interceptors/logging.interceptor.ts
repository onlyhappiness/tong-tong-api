import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { catchError, Observable, tap, throwError } from 'rxjs';

/** 던져진 값에서 상태코드를 뽑는다. HttpException이 아니면 500이다. */
function statusOf(error: unknown): number {
  return error instanceof HttpException ? error.getStatus() : 500;
}

/**
 * 에러 본문을 로그용 문자열로. rxjs는 무엇이든 던질 수 있으므로
 * Error가 아닌 값(문자열·null 등)도 안전하게 다뤄야 한다.
 */
function detailOf(error: unknown): string {
  if (error instanceof HttpException)
    return JSON.stringify(error.getResponse());
  if (error instanceof Error) return error.message;
  return String(error);
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    // 제네릭을 주지 않으면 any가 되고, 아래 req.method·req.url이 전부
    // 타입 검사를 빠져나간다.
    const req = http.getRequest<Request>();
    const now = Date.now();
    const method = req.method;
    const url = req.url;

    return next.handle().pipe(
      tap(() => {
        const statusCode = http.getResponse<Response>().statusCode;
        const delay = Date.now() - now;
        console.log(`${method} ${url} ${statusCode} ${delay}ms`);
      }),
      catchError((error: unknown) => {
        const delay = Date.now() - now;

        console.log(
          `${method} ${url} ${statusOf(error)} ${delay}ms - Error: ${detailOf(error)}`,
        );
        return throwError(() => error);
      }),
    );
  }
}
