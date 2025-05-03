import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('API');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, originalUrl, body, query, params, headers } = request;

    // Check for CORS preflight
    const isPreFlight = method === 'OPTIONS';
    
    // Log the incoming request
    this.logger.log({
      type: 'Request',
      method,
      url: originalUrl,
      params,
      query,
      body: Object.keys(body || {}).length ? body : undefined,
      origin: headers.origin,
      referer: headers.referer,
      userAgent: headers['user-agent'],
      isPreFlight,
    });

    // Check CORS headers
    const corsIssue = this.checkCorsIssue(request, response);
    if (corsIssue) {
      this.logger.warn({
        type: 'CORS',
        method,
        url: originalUrl,
        origin: headers.origin,
        issue: corsIssue,
      });
    }

    return next.handle().pipe(
      tap((responseBody) => {
        const responseTime = Date.now() - startTime;
        // Log successful response
        this.logger.log({
          type: 'Response',
          method,
          url: originalUrl,
          statusCode: response.statusCode,
          responseTime: `${responseTime}ms`,
          responseHeaders: {
            'access-control-allow-origin': response.getHeader('access-control-allow-origin'),
            'access-control-allow-methods': response.getHeader('access-control-allow-methods'),
            'access-control-allow-headers': response.getHeader('access-control-allow-headers'),
          },
          response: responseBody,
        });
      }),
      catchError((error) => {
        const responseTime = Date.now() - startTime;
        const isCorsError = this.isCorsError(error);
        
        // Log error response
        this.logger.error({
          type: isCorsError ? 'CORS Error' : 'Error',
          method,
          url: originalUrl,
          statusCode: error.status || 500,
          responseTime: `${responseTime}ms`,
          origin: headers.origin,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          corsDetails: isCorsError ? {
            allowedOrigins: response.getHeader('access-control-allow-origin'),
            allowedMethods: response.getHeader('access-control-allow-methods'),
            allowedHeaders: response.getHeader('access-control-allow-headers'),
            requestOrigin: headers.origin,
            requestMethod: method,
          } : undefined,
        });
        throw error;
      })
    );
  }

  private checkCorsIssue(request: Request, response: Response): string | null {
    const { headers, method } = request;
    const origin = headers.origin;
    
    if (!origin) {
      return null; // Not a CORS request
    }

    const allowedOrigin = response.getHeader('access-control-allow-origin');
    if (!allowedOrigin) {
      return 'Missing CORS headers in response';
    }

    if (allowedOrigin !== '*' && allowedOrigin !== origin) {
      return `Origin ${origin} not allowed`;
    }

    if (method === 'OPTIONS') {
      const requestMethod = headers['access-control-request-method'];
      const allowedMethods = response.getHeader('access-control-allow-methods');
      if (requestMethod && allowedMethods && !allowedMethods.toString().includes(requestMethod)) {
        return `Method ${requestMethod} not allowed`;
      }
    }

    return null;
  }

  private isCorsError(error: any): boolean {
    return (
      error.message?.includes('CORS') ||
      error.message?.includes('cross-origin') ||
      error.name === 'CrossOriginError' ||
      error.status === 403
    );
  }
} 