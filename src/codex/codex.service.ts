import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Codex } from '@codex-data/sdk';
import { TokenRankingAttribute, RankingDirection } from '@codex-data/sdk/dist/sdk/generated/graphql';
import moment from 'moment';
import { BlockchainType, Deployment, NATIVE_TOKEN } from '../deployment/deployment.service';

export const NETWORK_IDS = {
  [BlockchainType.Sei]: 531,
  [BlockchainType.Celo]: 42220,
  [BlockchainType.Ethereum]: 1,

  [BlockchainType.Fantom]: 250,
  [BlockchainType.Mantle]: 5000,
  [BlockchainType.Blast]: 81457,
  [BlockchainType.Linea]: 59144,
  [BlockchainType.Berachain]: 80094,
  [BlockchainType.Base]: 8453,
  [BlockchainType.Sonic]: 122,
  [BlockchainType.Iota]: 42161,
};

@Injectable()
export class CodexService {
  private sdk: Codex;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('CODEX_API_KEY');
    this.sdk = new Codex(apiKey);
  }

  async getLatestPrices(deployment: Deployment, addresses: string[]): Promise<any> {
    if (addresses.length === 0) return {};

    const networkId = NETWORK_IDS[deployment.blockchainType];
    if (!networkId) return null;

    // Replace only if targetAddress (NATIVE_TOKEN) is present in addresses
    if (deployment.nativeTokenAlias) {
      addresses = addresses.map((address) => {
        if (address.toLowerCase() === NATIVE_TOKEN.toLowerCase()) {
          return deployment.nativeTokenAlias;
        }
        return address;
      });
    }

    const result = {};
    const tokens = await this.fetchTokens(networkId, addresses);

    tokens.forEach((t) => {
      const address = t.token.address.toLowerCase();
      if (address) {
        result[address] = {
          address,
          usd: Number(t.priceUSD),
          provider: 'codex',
          last_updated_at: moment().unix(),
        };
      }
    });

    if (deployment.nativeTokenAlias && result[deployment.nativeTokenAlias.toLowerCase()]) {
      result[NATIVE_TOKEN.toLowerCase()] = {
        address: NATIVE_TOKEN.toLowerCase(),
        usd: result[deployment.nativeTokenAlias.toLowerCase()].usd,
        provider: 'codex',
        last_updated_at: moment().unix(),
      };
    }

    return result;
  }

  async getHistoricalQuotes(deployment: Deployment, tokenAddresses: string[], from: number, to: number) {
    const limit = (await import('p-limit')).default;
    const concurrencyLimit = limit(1);
    const maxPoints = 1499;
    const resolution = 240; // Resolution in minutes (adjustable here)
    const resolutionSeconds = resolution * 60; // Convert resolution to seconds
    const maxBatchDuration = maxPoints * resolutionSeconds; // Max batch duration in seconds
    const networkId = NETWORK_IDS[deployment.blockchainType];

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
      for (let start = from; start < to; start += maxBatchDuration) {
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

  async getAllTokenAddresses(deployment: Deployment): Promise<string[]> {
    const networkId = NETWORK_IDS[deployment.blockchainType];
    const tokens = await this.fetchTokens(networkId);
    const uniqueAddresses = Array.from(new Set(tokens.map((t) => t.token.address.toLowerCase())));
    return uniqueAddresses;
  }

  private async fetchTokens(networkId: number, addresses?: string[]) {
    const limit = 50;  // Each request is limited to 50 tokens
    let offset = 0;
    let allTokens = [];
    let fetched = [];
    const MAX_OFFSET = 5000; // Maximum allowed offset + limit

    do {
      try {
        // Check if we're about to exceed the maximum offset
        if (offset + limit > MAX_OFFSET) {
          console.warn(`Reached maximum offset limit of ${MAX_OFFSET}`);
          break;
        }

        const result = await this.sdk.queries.filterTokens({
          filters: {
            network: [networkId],
          },
          tokens: addresses || undefined,
          limit,
          offset,
          rankings: [{
            attribute: TokenRankingAttribute.Volume24,
            direction: RankingDirection.Desc
          }]
        });

        fetched = result.filterTokens.results;
        
        // Log the first batch of tokens with their volume
        if (offset === 0) {
          console.log(`First ${limit} tokens by 24h volume:`);
          fetched.forEach((token, index) => {
            console.log(`${index + 1}. Address: ${token.token.address}, Volume24: ${token.volume24}, Symbol: ${token.token.symbol}`);
          });
        }

        allTokens = [...allTokens, ...fetched];
        offset += limit;
      } catch (error) {
        console.error('Error fetching tokens:', error);
        throw error;
      }
    } while (fetched.length === limit);

    return allTokens;
  }
}