import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('API');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, query, headers } = req;
    const logger = this.logger;  // Store reference to logger

    // Check for CORS preflight
    const isPreFlight = method === 'OPTIONS';

    // Log the incoming request - omitting body for security
    this.logger.log({
      type: 'Request',
      method,
      url: originalUrl,
      query,
      origin: headers.origin,
      referer: headers.referer,
      userAgent: headers['user-agent'],
      isPreFlight,
    });

    // Check CORS headers
    if (headers.origin) {
      this.logger.debug({
        type: 'CORS Request',
        origin: headers.origin,
        method,
        requestedMethod: headers['access-control-request-method'],
        requestedHeaders: headers['access-control-request-headers'],
      });
    }

    // Override end to log response metadata only
    const originalEnd = res.end;
    res.end = (...args: any[]) => {
      const responseTime = Date.now() - startTime;

      try {
        const logData = {
          type: 'Response',
          method,
          url: originalUrl,
          statusCode: res.statusCode,
          responseTime: `${responseTime}ms`,
          corsHeaders: {
            'access-control-allow-origin': res.getHeader('access-control-allow-origin'),
            'access-control-allow-methods': res.getHeader('access-control-allow-methods'),
            'access-control-allow-headers': res.getHeader('access-control-allow-headers'),
          },
        };

        if (res.statusCode >= 400) {
          logger.error(logData);
        } else {
          logger.log(logData);
        }
      } catch (error) {
        logger.error('Error logging response:', error);
      }

      return originalEnd.apply(res, args);
    };

    next();
  }
}
