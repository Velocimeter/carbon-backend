import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Codex } from '@codex-data/sdk';
import moment from 'moment';
import { BlockchainType, Deployment, NATIVE_TOKEN } from '../deployment/deployment.service';
import { RankingDirection, TokenRankingAttribute } from '@codex-data/sdk/dist/resources/graphql';

export const SEI_NETWORK_ID = 531;
export const CELO_NETWORK_ID = 42220;
export const ETHEREUM_NETWORK_ID = 1;

@Injectable()
export class CodexService {
  private logger = new Logger(CodexService.name);
  private sdk: Codex;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('CODEX_API_KEY');
    this.sdk = new Codex(apiKey);
  }

  async getLatestPrices(deployment: Deployment, addresses: string[]): Promise<any> {
    const networkId = this.getNetworkId(deployment.blockchainType);
    if (!networkId) return null;

    const originalAddresses = [...addresses];
    let nativeTokenAliasUsed = false;

    // Replace only if targetAddress (NATIVE_TOKEN) is present in addresses
    if (deployment.nativeTokenAlias) {
      addresses = addresses.map((address) => {
        if (address.toLowerCase() === NATIVE_TOKEN.toLowerCase()) {
          nativeTokenAliasUsed = true;
          return deployment.nativeTokenAlias;
        }
        return address;
      });
    }

    const result = {};
    const tokens = await this.fetchTokens(networkId, addresses);

    tokens.forEach((t) => {
      const address = t.token.address.toLowerCase();
      const originalAddress = originalAddresses.find(
        (addr) =>
          addr.toLowerCase() === address || (nativeTokenAliasUsed && addr.toLowerCase() === NATIVE_TOKEN.toLowerCase()),
      );

      if (originalAddress) {
        result[originalAddress.toLowerCase()] = {
          address: originalAddress.toLowerCase(),
          usd: Number(t.priceUSD),
          provider: 'codex',
          last_updated_at: moment().unix(),
        };
      }
    });

    return result;
  }

  async getHistoricalQuotes(networkId: number, tokenAddresses: string[], from: number, to: number) {
    const MAX_TIME_RANGE = 10000 * 240 * 60; // 10k points * 240 minutes * 60 seconds

    // Adjust 'from' if time range exceeds limit
    const adjustedFrom = Math.max(from, to - MAX_TIME_RANGE);
    if (adjustedFrom > from) {
      console.warn(
        `Time range exceeded maximum of ${MAX_TIME_RANGE} seconds. Adjusting start time from ${from} to ${adjustedFrom}`,
      );
    }

    const limit = (await import('p-limit')).default;
    const concurrencyLimit = limit(1);
    const maxPoints = 1499;
    const resolution = 240;
    const resolutionSeconds = resolution * 60;
    const maxBatchDuration = maxPoints * resolutionSeconds;

    const fetchWithRetry = async (tokenAddress: string, batchFrom: number, batchTo: number): Promise<any> => {
      try {
        const bars = await this.sdk.queries.bars({
          symbol: `${tokenAddress}:${networkId}`,
          from: batchFrom,
          to: batchTo,
          resolution: `${resolution}`, // Use resolution variable
          removeLeadingNullValues: true,
        });
        return { ...bars.getBars, address: tokenAddress };
      } catch (error) {
        console.error(`Error fetching data for ${tokenAddress}, retrying...`, error);
        return fetchWithRetry(tokenAddress, batchFrom, batchTo);
      }
    };

    const fetchAllBatches = async (tokenAddress: string): Promise<any> => {
      const batchedResults = [];
      for (let start = adjustedFrom; start < to; start += maxBatchDuration) {
        const end = Math.min(start + maxBatchDuration, to);
        batchedResults.push(await fetchWithRetry(tokenAddress, start, end));
      }
      return batchedResults.flatMap((result) => result);
    };

    try {
      const results = await Promise.all(
        tokenAddresses.map((tokenAddress) => concurrencyLimit(() => fetchAllBatches(tokenAddress))),
      );

      const quotesByAddress = {};
      results.forEach((batchedResult, index) => {
        const tokenAddress = tokenAddresses[index];
        quotesByAddress[tokenAddress] = batchedResult.flatMap((result) =>
          result.t.map((timestamp: number, i: number) => ({
            timestamp,
            usd: result.c[i],
          })),
        );
      });

      return quotesByAddress;
    } catch (error) {
      console.error('Unexpected error:', error);
      throw error;
    }
  }

  async getAllTokenAddresses(networkId: number): Promise<string[]> {
    const tokens = await this.fetchTokens(networkId);
    const uniqueAddresses = Array.from(new Set(tokens.map((t) => t.token.address.toLowerCase())));
    return uniqueAddresses;
  }

  private async fetchTokens(networkId: number, addresses?: string[]) {
    // If addresses are provided, use them directly without pagination
    if (addresses && addresses.length > 0) {
      const result = await this.retryRequest(
        async () =>
          this.sdk.queries.filterTokens({
            filters: {
              network: [networkId],
            },
            tokens: addresses,
            limit: addresses.length,
            offset: 0,
          }),
        'fetchTokens.specificAddresses',
      );
      return result.filterTokens.results;
    }

    const limit = 200;
    const allTokens = new Set<string>();
    const now = Math.floor(Date.now() / 1000);
    let daysPerChunk = 30; // Start with one year
    const monthsToGoBack = 12 * 5; // 5 years
    const oneDayInSeconds = 24 * 60 * 60;

    let currentTime = now - monthsToGoBack * 30 * oneDayInSeconds;

    while (currentTime < now && daysPerChunk >= 1) {
      try {
        const chunkSize = daysPerChunk * oneDayInSeconds;
        const endTime = Math.min(currentTime + chunkSize, now);

        this.logger.log(
          `Processing period ${new Date(currentTime * 1000).toLocaleDateString()} to ${new Date(
            endTime * 1000,
          ).toLocaleDateString()} (${daysPerChunk} days per chunk)`,
        );

        let offset = 0;
        let fetched = [];

        do {
          const result = await this.retryRequest(
            async () =>
              this.sdk.queries.filterTokens({
                filters: {
                  network: [networkId],
                  priceUSD: { gt: 0 },
                  createdAt: { gte: currentTime, lt: endTime },
                },
                rankings: {
                  attribute: TokenRankingAttribute.CreatedAt,
                  direction: RankingDirection.Asc,
                },
                limit,
                offset,
              }),
            `fetchTokens.chunk.offset${offset}`,
          );

          fetched = result.filterTokens.results;
          fetched.forEach((token) => {
            allTokens.add(token.token.address.toLowerCase());
          });

          this.logger.debug(
            `Fetched ${fetched.length} tokens, offset: ${offset}, total unique tokens: ${allTokens.size}`,
          );

          offset += limit;
          if (offset >= 9800) throw new Error('Offset limit reached');
        } while (fetched.length === limit);

        currentTime = endTime; // Move to next chunk only on success
        this.logger.log(`Successfully processed chunk. Moving to next period.`);
      } catch (error) {
        if (error.message === 'Offset limit reached') {
          this.logger.warn(
            `Offset limit reached at ${new Date(
              currentTime * 1000,
            ).toLocaleDateString()} with ${daysPerChunk} days per chunk. Halving chunk size...`,
          );
          daysPerChunk = Math.floor(daysPerChunk / 2);
          continue; // Retry same time period with smaller chunk
        }
        throw error;
      }
    }

    this.logger.log(`Finished processing all periods. Total unique tokens found: ${allTokens.size}`);
    return Array.from(allTokens.values());
  }

  private async retryRequest<T>(operation: () => Promise<T>, context: string): Promise<T> {
    while (true) {
      try {
        return await operation();
      } catch (error) {
        console.error(`Error in ${context}, retrying...`, error);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  private getNetworkId(blockchainType: string): number {
    switch (blockchainType) {
      case BlockchainType.Sei:
        return SEI_NETWORK_ID;
      case BlockchainType.Celo:
        return CELO_NETWORK_ID;
      case BlockchainType.Ethereum:
        return ETHEREUM_NETWORK_ID;
      default:
        return null;
    }
  }
}
