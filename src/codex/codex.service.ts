import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Codex } from '@codex-data/sdk';
import moment from 'moment';
import { BlockchainType, Deployment, NATIVE_TOKEN } from '../deployment/deployment.service';
import { TokenService } from '../token/token.service';

export const NETWORK_IDS = {
  // [BlockchainType.Sei]: 531,
  // [BlockchainType.Celo]: 42220,
  [BlockchainType.Ethereum]: 1,
  [BlockchainType.Base]: 8453,
  // [BlockchainType.Fantom]: 250,
   [BlockchainType.Mantle]: 5000,
  // [BlockchainType.Blast]: 81457,
  // [BlockchainType.Linea]: 59144,
  [BlockchainType.Berachain]: 80094,
  [BlockchainType.Sonic]: 146,
};

@Injectable()
export class CodexService {
  private sdk: Codex;
  private readonly logger = new Logger(CodexService.name);

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => TokenService)) private tokenService: TokenService
  ) {
    const apiKey = this.configService.get<string>('CODEX_API_KEY');
    this.sdk = new Codex(apiKey);
    this.logger.log('Codex service initialized');
  }

  async getKnownTokenAddresses(deployment: Deployment): Promise<string[]> {
    console.log(`Fetching token addresses from database for ${deployment.blockchainType}...`);
    const tokens = await this.tokenService.getTokensByBlockchainType(deployment.blockchainType);
    const addresses = tokens.map(token => token.address.toLowerCase());
    
    // Add native token alias if it exists
    if (deployment.nativeTokenAlias) {
      addresses.push(deployment.nativeTokenAlias.toLowerCase());
    }
    
    console.log(`Found ${addresses.length} tokens in database for ${deployment.blockchainType}`);
    return Array.from(new Set(addresses)); // Ensure unique addresses
  }

  async getLatestPrices(deployment: Deployment, addresses: string[]): Promise<any> {
    if (addresses.length === 0) return {};

    const networkId = NETWORK_IDS[deployment.blockchainType];
    if (!networkId) {
      this.logger.warn(`No network ID configured for ${deployment.blockchainType}`);
      return null;
    }

    this.logger.log(`Fetching latest prices for ${addresses.length} tokens on ${deployment.blockchainType} (Network ID: ${networkId})`);

    // Replace only if targetAddress (NATIVE_TOKEN) is present in addresses
    if (deployment.nativeTokenAlias) {
      const originalAddresses = [...addresses];
      addresses = addresses.map((address) => {
        if (address.toLowerCase() === NATIVE_TOKEN.toLowerCase()) {
          this.logger.log(`Mapping native token ${NATIVE_TOKEN} to ${deployment.nativeTokenAlias}`);
          return deployment.nativeTokenAlias;
        }
        return address;
      });
    }

    const result = {};
    this.logger.log(`Calling Codex API to fetch token data...`);
    const tokens = await this.fetchTokens(networkId, addresses);
    this.logger.log(`Received data for ${tokens.length} tokens from Codex`);

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
      this.logger.log(`Adding native token price mapping for ${NATIVE_TOKEN}`);
      result[NATIVE_TOKEN.toLowerCase()] = {
        address: NATIVE_TOKEN.toLowerCase(),
        usd: result[deployment.nativeTokenAlias.toLowerCase()].usd,
        provider: 'codex',
        last_updated_at: moment().unix(),
      };
    }

    this.logger.log(`Returning price data for ${Object.keys(result).length} tokens`);
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
    const MAX_RETRIES = 2; // Limit retries to prevent infinite loops
    
    // Track failed tokens to avoid repeated failures
    const failedTokens = new Set();
    
    // Map native token to its alias if needed (similar to getLatestPrices)
    const mappedTokenAddresses = tokenAddresses.map(address => {
      if (address.toLowerCase() === NATIVE_TOKEN.toLowerCase() && deployment.nativeTokenAlias) {
        console.log(`Mapping native token ${NATIVE_TOKEN} to its alias ${deployment.nativeTokenAlias}`);
        return deployment.nativeTokenAlias;
      }
      return address;
    });
    
    // Keep track of original to mapped addresses for result mapping
    const addressMap = {};
    tokenAddresses.forEach((originalAddress, index) => {
      addressMap[mappedTokenAddresses[index]] = originalAddress;
    });

    const fetchWithRetry = async (tokenAddress: string, batchFrom: number, batchTo: number, retryCount = 0): Promise<any> => {
      if (failedTokens.has(tokenAddress)) {
        return { t: [], c: [], o: [], h: [], l: [], v: [], address: tokenAddress };
      }
      
      console.log(`Requesting Codex API: ${tokenAddress}:${networkId} (attempt ${retryCount+1})`);
      
      const response = await this.sdk.queries.bars({
        symbol: `${tokenAddress}:${networkId}`,
        from: batchFrom,
        to: batchTo,
        resolution: `${resolution}`,
        removeLeadingNullValues: true,
      });
      
      return { ...(response?.getBars || { t: [], c: [], o: [], h: [], l: [], v: [] }), address: tokenAddress };
    };

    const fetchAllBatches = async (tokenAddress: string): Promise<any> => {
      const batchedResults = [];
      
      for (let start = from; start < to; start += maxBatchDuration) {
        const end = Math.min(start + maxBatchDuration, to);
        batchedResults.push(await fetchWithRetry(tokenAddress, start, end));
      }
      
      const combinedResult = {
        t: [],
        c: [],
        h: [],
        l: [],
        o: [],
        v: [],
        address: tokenAddress
      };
      
      batchedResults.forEach(batch => {
        combinedResult.t = combinedResult.t.concat(batch.t || []);
        combinedResult.c = combinedResult.c.concat(batch.c || []);
        combinedResult.h = combinedResult.h.concat(batch.h || []);
        combinedResult.l = combinedResult.l.concat(batch.l || []);
        combinedResult.o = combinedResult.o.concat(batch.o || []);
        combinedResult.v = combinedResult.v.concat(batch.v || []);
      });
      
      return combinedResult;
    };

    const results = await Promise.all(
      mappedTokenAddresses.map((tokenAddress) => concurrencyLimit(() => fetchAllBatches(tokenAddress))),
    );

    const quotesByAddress = {};
    
    results.forEach((batchedResult, index) => {
      const mappedAddress = mappedTokenAddresses[index];
      const originalAddress = addressMap[mappedAddress];
      
      quotesByAddress[originalAddress] = batchedResult.t.map((timestamp: number, i: number) => ({
        timestamp,
        usd: batchedResult.c[i],
      })) || [];
    });

    return quotesByAddress;
  }

  async getAllTokenAddresses(deployment: Deployment): Promise<string[]> {
    const networkId = NETWORK_IDS[deployment.blockchainType];
    this.logger.log(`Fetching all token addresses for ${deployment.blockchainType} (Network ID: ${networkId})`);
    
    const tokens = await this.fetchTokens(networkId);
    const uniqueAddresses = Array.from(new Set(tokens.map((t) => t.token.address.toLowerCase())));
    
    this.logger.log(`Found ${uniqueAddresses.length} unique token addresses for ${deployment.blockchainType}`);
    return uniqueAddresses;
  }

  private async fetchTokens(networkId: number, addresses?: string[]) {
    const limit = 200;
    let allTokens = [];

    if (addresses && addresses.length > 0) {
      this.logger.log(`Fetching specific tokens for network ${networkId}, ${addresses.length} addresses in total`);
      const addressBatches = [];
      for (let i = 0; i < addresses.length; i += limit) {
        addressBatches.push(addresses.slice(i, i + limit));
      }
      this.logger.log(`Split into ${addressBatches.length} batches of ${limit} addresses`);

      for (const batch of addressBatches) {
        this.logger.debug(`Fetching batch of ${batch.length} tokens...`);
        const result = await this.sdk.queries.filterTokens({
          filters: {
            network: [networkId],
          },
          tokens: batch,
          limit,
          offset: 0,
        });

        allTokens = [...allTokens, ...result.filterTokens.results];
        this.logger.debug(`Batch fetch successful, got ${result.filterTokens.results.length} tokens`);
      }

      this.logger.log(`Successfully fetched ${allTokens.length} tokens in total`);
      return allTokens;
    } else {
      this.logger.log(`Fetching all tokens for network ${networkId}`);
      let offset = 0;
      let fetched = [];

      do {
        this.logger.debug(`Fetching tokens with offset ${offset}...`);
        const result = await this.sdk.queries.filterTokens({
          filters: {
            network: [networkId],
          },
          limit,
          offset,
        });

        fetched = result.filterTokens.results;
        allTokens = [...allTokens, ...fetched];
        offset += limit;
        this.logger.debug(`Fetched ${fetched.length} tokens, total so far: ${allTokens.length}`);
      } while (fetched.length === limit);

      this.logger.log(`Successfully fetched all ${allTokens.length} tokens`);
      return allTokens;
    }
  }
}