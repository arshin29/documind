import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorResponse: string | object = isHttpException
      ? exception.getResponse()
      : "Internal Server Error";

    let message = "An unexpected error occurred";
    let error = "Internal Server Error";

    if (typeof errorResponse === "string") {
      message = errorResponse;
    } else if (typeof errorResponse === "object" && errorResponse !== null) {
      const resObj = errorResponse as Record<string, any>;
      message = resObj.message || message;
      error = resObj.error || error;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - Status ${status} - Error: ${
          exception instanceof Error
            ? exception.stack
            : JSON.stringify(exception)
        }`,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - Status ${status} - ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error,
      message,
    });
  }
}
