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
      try {
        // Skip known failed tokens
        if (failedTokens.has(tokenAddress)) {
          console.log(`Skipping known problematic token: ${tokenAddress}`);
          return { t: [], c: [], o: [], h: [], l: [], v: [], address: tokenAddress };
        }
        
        // Log request details for debugging
        console.log(`Requesting Codex API: ${tokenAddress}:${networkId} (attempt ${retryCount+1})`);
        
        const response = await this.sdk.queries.bars({
          symbol: `${tokenAddress}:${networkId}`,
          from: batchFrom,
          to: batchTo,
          resolution: `${resolution}`,
          removeLeadingNullValues: true,
        });
        
        // Check response structure
        if (!response || !response.getBars) {
          console.error(`Empty or invalid response for ${tokenAddress}:${networkId}: ${JSON.stringify(response)}`);
          return { t: [], c: [], o: [], h: [], l: [], v: [], address: tokenAddress };
        }
        
        const bars = response.getBars;
        
        // Log success and data status
        if (!bars.t || bars.t.length === 0) {
          console.error(`Empty data array returned for ${tokenAddress}:${networkId}`);
          console.error(`Response structure: ${JSON.stringify(response, null, 2)}`);
          return { t: [], c: [], o: [], h: [], l: [], v: [], address: tokenAddress };
        } else {
          console.log(`Success! Found ${bars.t.length} data points for ${tokenAddress}:${networkId}`);
        }
        
        return { ...bars, address: tokenAddress };
      } catch (error) {
        // Basic error info
        console.error(`============ ERROR DETAILS START ============`);
        console.error(`Error fetching data for ${tokenAddress}:${networkId} (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        console.error(`Error message: ${error.message}`);
        console.error(`Error type: ${error.constructor.name}`);
        
        // Detailed error inspection
        if (error.response) {
          console.error(`Response status: ${error.response.status}`);
          console.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        
        if (error.request) {
          console.error(`Request made but no response received`);
        }
        
        // Log the full error for debugging
        console.error(`Full error object: ${JSON.stringify(error, (key, value) => {
          // Skip circular references
          if (key === 'request' || key === 'response') return typeof value;
          return value;
        }, 2)}`);
        console.error(`============ ERROR DETAILS END ============`);
        
        if (retryCount >= MAX_RETRIES) {
          console.warn(`Max retries reached for token ${tokenAddress}, marking as failed and returning empty data`);
          failedTokens.add(tokenAddress);
          return { t: [], c: [], o: [], h: [], l: [], v: [], address: tokenAddress };
        }
        
        // Wait a bit before retrying (exponential backoff)
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return fetchWithRetry(tokenAddress, batchFrom, batchTo, retryCount + 1);
      }
    };

    const fetchAllBatches = async (tokenAddress: string): Promise<any> => {
      try {
        const batchedResults = [];
        let hasData = false;
        
        for (let start = from; start < to; start += maxBatchDuration) {
          const end = Math.min(start + maxBatchDuration, to);
          const result = await fetchWithRetry(tokenAddress, start, end);
          
          // Check if this batch has data
          if (result && result.t && result.t.length > 0) {
            hasData = true;
          }
          
          batchedResults.push(result);
        }
        
        // Combine all batches into one result
        const combinedResult = {
          t: [],
          c: [],
          h: [],
          l: [],
          o: [],
          v: [],
          address: tokenAddress,
          hasData: hasData  // Add flag to track if any data was found
        };
        
        // Combine all the arrays from each batch
        batchedResults.forEach(batch => {
          if (batch.t && batch.t.length > 0) {
            combinedResult.t = combinedResult.t.concat(batch.t);
            combinedResult.c = combinedResult.c.concat(batch.c);
            combinedResult.h = combinedResult.h && batch.h ? combinedResult.h.concat(batch.h) : combinedResult.h;
            combinedResult.l = combinedResult.l && batch.l ? combinedResult.l.concat(batch.l) : combinedResult.l;
            combinedResult.o = combinedResult.o && batch.o ? combinedResult.o.concat(batch.o) : combinedResult.o;
            combinedResult.v = combinedResult.v && batch.v ? combinedResult.v.concat(batch.v) : combinedResult.v;
          }
        });
        
        return combinedResult;
      } catch (error) {
        console.error(`Failed to fetch all batches for ${tokenAddress}:`, error.message || 'Unknown error');
        return { t: [], c: [], address: tokenAddress, hasData: false };
      }
    };

    try {
      const results = await Promise.all(
        mappedTokenAddresses.map((tokenAddress) => concurrencyLimit(() => fetchAllBatches(tokenAddress))),
      );

      const quotesByAddress = {};
      
      // Process results
      results.forEach((batchedResult, index) => {
        const mappedAddress = mappedTokenAddresses[index];
        const originalAddress = addressMap[mappedAddress];
        
        // Log the data summary for debugging
        console.log(`Data summary for ${originalAddress}: ${batchedResult.hasData ? 'Has data' : 'No data'}, ${batchedResult.t ? batchedResult.t.length : 0} points`);
        
        // Skip if we couldn't get any data
        if (!batchedResult || !batchedResult.t || batchedResult.t.length === 0) {
          console.warn(`No valid data points for ${mappedAddress} (original: ${originalAddress}), setting empty quotes array`);
          quotesByAddress[originalAddress] = [];
          return;
        }
        
        // Map the quotes to the original address
        quotesByAddress[originalAddress] = batchedResult.t.map((timestamp: number, i: number) => ({
          timestamp,
          usd: batchedResult.c[i],
        }));
        
        console.log(`Successfully created ${quotesByAddress[originalAddress].length} quote objects for ${originalAddress}`);
      });

      return quotesByAddress;
    } catch (error) {
      console.error('Unexpected error in getHistoricalQuotes:', error.message || 'Unknown error');
      
      // Return an empty object rather than throwing
      const emptyResult = {};
      tokenAddresses.forEach(address => {
        emptyResult[address] = [];
      });
      return emptyResult;
    }
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
      // Process in batches of 200 addresses
      const addressBatches = [];
      for (let i = 0; i < addresses.length; i += limit) {
        addressBatches.push(addresses.slice(i, i + limit));
      }
      this.logger.log(`Split into ${addressBatches.length} batches of ${limit} addresses`);

      // Fetch each batch of addresses
      for (const batch of addressBatches) {
        try {
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
        } catch (error) {
          this.logger.error(`Error fetching token batch: ${error.message}`);
          throw error;
        }
      }

      this.logger.log(`Successfully fetched ${allTokens.length} tokens in total`);
      return allTokens;
    } else {
      this.logger.log(`Fetching all tokens for network ${networkId}`);
      let offset = 0;
      let fetched = [];

      do {
        try {
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
        } catch (error) {
          this.logger.error(`Error fetching tokens at offset ${offset}: ${error.message}`);
          throw error;
        }
      } while (fetched.length === limit);

      this.logger.log(`Successfully fetched all ${allTokens.length} tokens`);
      return allTokens;
    }
  }
}