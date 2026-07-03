/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const err = exception.getResponse() as
      | { message: any; statusCode: number }
      | { error: string; statusCode: 400; message: string[] };

    if (typeof err !== 'string') {
      return response.status(statusCode).json({
        success: false,
        code: statusCode,
        data: err.message,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      });
    }

    response.status(statusCode).json({
      success: false,
      code: statusCode,
      data: err,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }
}
