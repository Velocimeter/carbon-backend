import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Codex } from '@codex-data/sdk';
import moment from 'moment';
import { BlockchainType, Deployment, NATIVE_TOKEN } from '../deployment/deployment.service';

export const NETWORK_IDS = {
  [BlockchainType.Sei]: 531,
  [BlockchainType.Celo]: 42220,
  [BlockchainType.Ethereum]: 1,
  [BlockchainType.Fantom]: 250,
  [BlockchainType.Blast]: 81457,
  [BlockchainType.Linea]: 59144,
  [BlockchainType.Berachain]: 80094,
  [BlockchainType.Sonic]: 146,
  [BlockchainType.Iota]: 8822,
  [BlockchainType.Mantle]: 5000,
  [BlockchainType.Base]: 8453,
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
    const batchSize = 100;
    const delayBetweenBatches = 30; // 1 second delay between batches
    const maxRetries = 3;
    
    // Process addresses in batches
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batchAddresses = addresses.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(addresses.length / batchSize);
      
      console.log(`[CodexService] Polling batch ${batchNum} of ${totalBatches} (${batchAddresses.length} tokens)`);
      
      let retryCount = 0;
      while (retryCount < maxRetries) {
        try {
          const tokens = await this.fetchTokens(networkId, batchAddresses);
          
          // Log which tokens were found vs not found
          const foundAddresses = new Set(tokens.map(t => t.token.address.toLowerCase()));
          const missingAddresses = batchAddresses.filter(addr => !foundAddresses.has(addr.toLowerCase()));
          
          if (missingAddresses.length > 0) {
            console.log(`[CodexService] Warning: No quotes found for ${missingAddresses.length} tokens in batch ${batchNum}:`, missingAddresses);
          }
          
          tokens.forEach((t) => {
            const address = t.token.address.toLowerCase();
            if (address && t.priceUSD) {
              result[address] = {
                address,
                usd: Number(t.priceUSD),
                provider: 'codex',
                last_updated_at: moment().unix(),
              };
            } else if (address) {
              console.log(`[CodexService] Warning: Token found but no price for ${address}`);
            }
          });
          
          // If successful, break retry loop
          break;
        } catch (error) {
          retryCount++;
          console.error(`[CodexService] Error while polling batch ${batchNum} (attempt ${retryCount}/${maxRetries}):`, error);
          
          if (retryCount === maxRetries) {
            console.error(`[CodexService] Failed to poll batch ${batchNum} after ${maxRetries} attempts, skipping...`);
            // Log the addresses that failed
            console.error(`[CodexService] Failed addresses in batch ${batchNum}:`, batchAddresses);
          } else {
            // Wait longer between retries (exponential backoff)
            const retryDelay = delayBetweenBatches * Math.pow(2, retryCount - 1);
            console.log(`[CodexService] Retrying poll for batch ${batchNum} in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      // Add delay between batches, but only if not the last batch
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    if (deployment.nativeTokenAlias && result[deployment.nativeTokenAlias.toLowerCase()]) {
      result[NATIVE_TOKEN.toLowerCase()] = {
        address: NATIVE_TOKEN.toLowerCase(),
        usd: result[deployment.nativeTokenAlias.toLowerCase()].usd,
        provider: 'codex',
        last_updated_at: moment().unix(),
      };
    }

    // Log summary of results
    const totalTokens = addresses.length;
    const quotesFound = Object.keys(result).length;
    console.log(`[CodexService] Summary: Found quotes for ${quotesFound}/${totalTokens} tokens`);
    if (quotesFound < totalTokens) {
      const missingAddresses = addresses.filter(addr => !result[addr.toLowerCase()]);
      console.log(`[CodexService] Missing quotes for ${missingAddresses.length} tokens:`, missingAddresses);
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
        console.error(`Error during token price polling for ${tokenAddress}, retrying...`, error);
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
      console.error('Unexpected error during price polling:', error);
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
    const limit = 100;
    let offset = 0;
    let allTokens = [];
    let fetched = [];

    do {
      try {
        const result = await this.sdk.queries.filterTokens({
          filters: {
            network: [networkId],
          },
          tokens: addresses || undefined, // Use addresses if provided, otherwise fetch all
          limit,
          offset,
        });

        fetched = result.filterTokens.results;
        allTokens = [...allTokens, ...fetched];
        offset += limit;
      } catch (error) {
        console.error('Error during token list polling:', error);
        throw error;
      }
    } while (fetched.length === limit);

    return allTokens;
  }

  async getTokenMetadata(networkId: number, addresses: string[]): Promise<any> {
    try {
      const result = await this.sdk.queries.filterTokens({
        filters: {
          network: [networkId],
        },
        tokens: addresses,
        limit: addresses.length,
      });
      return result?.filterTokens?.results || [];
    } catch (error) {
      console.warn(`[codex] Failed to fetch token metadata: ${error.message}`);
      return [];
    }
  }
}
