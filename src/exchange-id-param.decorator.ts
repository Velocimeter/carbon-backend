import { Request } from 'express';
import { ExchangeId } from './deployment/deployment.service';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
// bump to fix multichain
export function extractExchangeId(request: Request, exchangeIdParam?: string): ExchangeId {
  let exchangeId: ExchangeId;

  if (exchangeIdParam) {
    exchangeId = exchangeIdParam as ExchangeId;
  } else {
    let subdomain = request.hostname.split('.')[0];
    // Handle localhost case
    // Default for localhost -> use Ethereum unless overridden
    if (request.hostname === 'localhost') {
      return ExchangeId.OGEthereum;
    }
    if (subdomain.endsWith('-automate-api')) {
      subdomain = subdomain.slice(0, -13); // Remove '-automate-api' suffix
    }
    if (subdomain === 'automate-api') {
      subdomain = ExchangeId.OGEthereum;
    }
    exchangeId = subdomain ? (subdomain as ExchangeId) : (ExchangeId.OGEthereum as ExchangeId);
  }

  if (!Object.values(ExchangeId).includes(exchangeId)) {
    throw new Error(`Invalid ExchangeId: ${exchangeId}`);
  }

  return exchangeId;
}



export const ApiExchangeIdParam = () =>
  ApiParam({
    name: 'exchangeId',
    required: true,
    enum: ExchangeId,
  });

export const ExchangeIdParam = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const exchangeIdParam = ctx.switchToHttp().getRequest().params.exchangeId;
  return extractExchangeId(request, exchangeIdParam);
});
