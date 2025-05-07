import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VolumeTokensDto } from '../v1/analytics/volume.tokens.dto';
import { LastProcessedBlockService } from '../last-processed-block/last-processed-block.service';
import { Deployment } from '../deployment/deployment.service';
import moment from 'moment';
import { HistoricQuoteService } from '../historic-quote/historic-quote.service';
import Decimal from 'decimal.js';
import { TokensByAddress } from '../token/token.service';
import { PairsDictionary } from '../pair/pair.service';
import { VolumePairsDto } from '../v1/analytics/volume.pairs.dto';
import { VolumeTotalDto } from '../v1/analytics/volume.total.dto';

// Types for the returned results
type VolumeByAddressResult = {
  timestamp: number;
  address: string;
  symbol: string;
  volumeUsd: number;
  feesUsd: number;
};

type VolumeByPairResult = {
  timestamp: number;
  pairId: number;
  volumeUsd: number;
  feesUsd: number;
};

// Enhanced result type for the pairs aggregate endpoint
interface EnhancedVolumeByPairResult extends VolumeByPairResult {
  token0: {
    address: string;
    symbol: string;
    feesUsd: number;
  };
  token1: {
    address: string;
    symbol: string;
    feesUsd: number;
  };
}

type VolumeResult = {
  timestamp: number;
  volumeUsd: number;
  feesUsd: number;
};

@Injectable()
export class VolumeService {
  constructor(
    private dataSource: DataSource,
    private lastProcessedBlockService: LastProcessedBlockService,
    private historicQuoteService: HistoricQuoteService,
  ) {}

  async getVolume(
    deployment: Deployment,
    params: VolumeTokensDto | VolumePairsDto | VolumeTotalDto,
    tokens: TokensByAddress,
    pairs?: PairsDictionary,
  ): Promise<VolumeByAddressResult[] | VolumeByPairResult[]> {
    const start = params.start ?? moment().subtract(1, 'year').unix();
    const end = params.end ?? moment().unix();
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 10000;

    const startFormatted = moment.unix(start).format('YYYY-MM-DD HH:mm:ss');
    const endFormatted = moment.unix(end).format('YYYY-MM-DD HH:mm:ss');

    let volumeData;
    if (this.isVolumeTokensDto(params)) {
      volumeData = await this.generateVolumeByAddress(deployment, params, tokens, startFormatted, endFormatted);
      volumeData = this.accumulateByAddressAndTimestamp(volumeData);
    } else if (this.isVolumePairsDto(params)) {
      volumeData = await this.generateVolumeByPair(deployment, params, pairs, startFormatted, endFormatted);
    } else if (this.isTotalVolumeDto(params)) {
      volumeData = await this.generateVolumeByAddress(deployment, params, tokens, startFormatted, endFormatted);
      volumeData = this.accumulateByTimestamp(volumeData);
    }

    // Apply pagination (offset and limit) on the sorted result
    return volumeData.slice(offset, offset + limit);
  }

  // New method to get total volume data without timestamp bucketing
  async getTotalVolumeByAddress(
    deployment: Deployment,
    params: VolumeTokensDto | VolumeTotalDto,
    tokens: TokensByAddress,
  ): Promise<VolumeByAddressResult[]> {
    // Use the same start/end parameters as the regular method
    const start = params.start ?? moment().subtract(1, 'year').unix();
    const end = params.end ?? moment().unix();
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 10000;

    const startFormatted = moment.unix(start).format('YYYY-MM-DD HH:mm:ss');
    const endFormatted = moment.unix(end).format('YYYY-MM-DD HH:mm:ss');

    console.log(`[VolumeService] Getting total volume for period ${startFormatted} to ${endFormatted}`);
    console.log(`[VolumeService] Query parameters:`, {
      start,
      end,
      offset,
      limit,
      hasOwnerId: !!params.ownerId,
      ownerId: params.ownerId,
      hasAddresses: 'addresses' in params,
      addressesLength: 'addresses' in params && params.addresses ? params.addresses.length : 0,
      tokensCount: Object.keys(tokens).length
    });

    // Determine which token IDs to query
    let tokenIds = [];
    if ('addresses' in params && params.addresses && params.addresses.length > 0) {
      console.log(`[VolumeService] Getting volume for specific tokens: ${params.addresses.length} addresses`);
      console.log(`[VolumeService] Token addresses:`, params.addresses);
      
      tokenIds = params.addresses
        .map((a) => {
          const token = tokens[a.toLowerCase()];
          if (!token) {
            console.log(`[VolumeService] Token not found for address: ${a}`);
            return null;
          }
          console.log(`[VolumeService] Found token for address ${a}: ID=${token.id}, Symbol=${token.symbol}`);
          return token.id;
        })
        .filter(Boolean);
    } else {
      console.log(`[VolumeService] No specific tokens provided, using all tokens (${Object.keys(tokens).length})`);
      tokenIds = Object.values(tokens).map((t) => t.id);
      
      // Log a few tokens for debugging
      const sampleTokens = Object.values(tokens).slice(0, 5);
      console.log(`[VolumeService] Sample of tokens (first 5):`, 
        sampleTokens.map(t => ({ id: t.id, address: t.address, symbol: t.symbol })));
    }

    // If no valid token IDs, return empty array
    if (tokenIds.length === 0) {
      console.log(`[VolumeService] No valid token IDs found`);
      return [];
    }

    console.log(`[VolumeService] Processing query for ${tokenIds.length} tokens`);

    // Add owner filter if specified
    let ownerFilter = '';
    if (params.ownerId) {
      ownerFilter = `AND tte."trader" = '${params.ownerId}'`;
      console.log(`[VolumeService] Filtering by owner: ${params.ownerId}`);
    }

    // Execute SQL query without time bucketing
    try {
      const sqlQuery = `
        SELECT
          "targetToken"."address" AS "address",
          "targetToken"."symbol" AS "symbol",
          SUM("targetAmount" :: decimal / POWER(10, "targetToken"."decimals")) AS "volume",
          SUM("tradingFeeAmount" :: decimal / POWER(10, "feeToken"."decimals")) AS "fees",
          "feeToken"."address" AS "feeAddress",
          "feeToken"."symbol" AS "feeSymbol"
        FROM
          "tokens-traded-events" tte
        JOIN tokens "feeToken"
          ON (CASE 
                WHEN tte."byTargetAmount" = TRUE THEN tte."sourceTokenId"
                ELSE tte."targetTokenId"
              END) = "feeToken"."id"
        JOIN tokens "targetToken" 
          ON tte."targetTokenId" = "targetToken"."id"
        WHERE
          tte."blockchainType" = '${deployment.blockchainType}'
          AND tte."exchangeId" = '${deployment.exchangeId}'
          AND tte."targetTokenId" IN (${tokenIds.join(', ')})
          AND tte."timestamp" >= '${startFormatted}'
          AND tte."timestamp" <= '${endFormatted}'
          ${ownerFilter}
        GROUP BY
          "targetToken"."address",
          "targetToken"."symbol",
          "feeToken"."address",
          "feeToken"."symbol"
        ORDER BY
          "address";
      `;
      
      console.log(`[VolumeService] Executing SQL query for token volume data:`);
      console.log(`[VolumeService] SQL Query (shortened):`, sqlQuery.substring(0, 500) + '...');
      console.log(`[VolumeService] Query parameters: exchange=${deployment.exchangeId}, blockchain=${deployment.blockchainType}, tokenIds=${tokenIds.length > 5 ? tokenIds.slice(0, 5).join(', ') + '...' : tokenIds.join(', ')}`);
      
      // Check if there are any tokens in the database
      const tokenCount = await this.dataSource.query(`
        SELECT COUNT(*) as count FROM tokens 
        WHERE "blockchainType" = '${deployment.blockchainType}' 
        AND "exchangeId" = '${deployment.exchangeId}'
      `);
      console.log(`[VolumeService] Total tokens in database: ${tokenCount[0].count}`);
      
      // Check if there are any trades in the database
      const tradeCount = await this.dataSource.query(`
        SELECT COUNT(*) as count FROM "tokens-traded-events"
        WHERE "blockchainType" = '${deployment.blockchainType}' 
        AND "exchangeId" = '${deployment.exchangeId}'
        AND "timestamp" >= '${startFormatted}'
        AND "timestamp" <= '${endFormatted}'
      `);
      console.log(`[VolumeService] Total trades in database for time period: ${tradeCount[0].count}`);
      
      // Execute the main query
      const result = await this.dataSource.query(sqlQuery);

      console.log(`[VolumeService] SQL query returned ${result?.length || 0} rows`);
      
      if (!result || result.length === 0) {
        console.log(`[VolumeService] No volume data found for the given tokens and time period`);
        console.log(`[VolumeService] Check if trades exist for these tokens`);
        
        // Check if any trades exist for these tokens at all (ignoring time period)
        const anyTradesForTokens = await this.dataSource.query(`
          SELECT COUNT(*) as count FROM "tokens-traded-events"
          WHERE "blockchainType" = '${deployment.blockchainType}' 
          AND "exchangeId" = '${deployment.exchangeId}'
          AND "targetTokenId" IN (${tokenIds.join(', ')})
        `);
        console.log(`[VolumeService] Trades for these tokens (any time period): ${anyTradesForTokens[0].count}`);
        
        // If there's data but we're not getting results, try removing time constraints
        if (parseInt(anyTradesForTokens[0].count) > 0) {
          console.log(`[VolumeService] Data exists for these tokens, but not in the specified time range. Trying without time constraints...`);
          const resultWithoutTimeConstraint = await this.dataSource.query(`
            SELECT
              "targetToken"."address" AS "address",
              "targetToken"."symbol" AS "symbol",
              SUM("targetAmount" :: decimal / POWER(10, "targetToken"."decimals")) AS "volume",
              SUM("tradingFeeAmount" :: decimal / POWER(10, "feeToken"."decimals")) AS "fees",
              "feeToken"."address" AS "feeAddress",
              "feeToken"."symbol" AS "feeSymbol"
            FROM
              "tokens-traded-events" tte
            JOIN tokens "feeToken"
              ON (CASE 
                    WHEN tte."byTargetAmount" = TRUE THEN tte."sourceTokenId"
                    ELSE tte."targetTokenId"
                  END) = "feeToken"."id"
            JOIN tokens "targetToken" 
              ON tte."targetTokenId" = "targetToken"."id"
            WHERE
              tte."blockchainType" = '${deployment.blockchainType}'
              AND tte."exchangeId" = '${deployment.exchangeId}'
              AND tte."targetTokenId" IN (${tokenIds.join(', ')})
              ${ownerFilter}
            GROUP BY
              "targetToken"."address",
              "targetToken"."symbol",
              "feeToken"."address",
              "feeToken"."symbol"
            ORDER BY
              "address";
          `);
          console.log(`[VolumeService] Query without time constraints returned ${resultWithoutTimeConstraint?.length || 0} rows`);
        }
        
        return [];
      }

      // Format the result
      const volumeData = result.map((row) => ({
        // Use a fixed timestamp for all records (just for compatibility)
        timestamp: moment().unix(),
        address: row.address,
        symbol: row.symbol,
        volume: parseFloat(row.volume) || 0,
        fees: parseFloat(row.fees) || 0,
        feeAddress: row.feeAddress,
        feeSymbol: row.feeSymbol,
      }));

      console.log(`[VolumeService] First row of volume data:`, volumeData.length > 0 ? volumeData[0] : 'No data');

      // Get USD rates for the tokens
      const uniqueTokenAddresses = new Set<string>();
      volumeData.forEach((volumeEntry) => {
        uniqueTokenAddresses.add(volumeEntry.feeAddress.toLowerCase());
        uniqueTokenAddresses.add(volumeEntry.address.toLowerCase());
      });

      console.log(`[VolumeService] Getting USD rates for ${uniqueTokenAddresses.size} unique tokens`);
      const usdRates = await this.historicQuoteService.getUsdRates(
        deployment,
        Array.from(uniqueTokenAddresses),
        startFormatted,
        endFormatted,
      );
      console.log(`[VolumeService] Got USD rates for ${usdRates?.length || 0} tokens`);

      // Convert to USD values
      const volumeWithUsd = this.mapVolumeDataToUsd(volumeData, usdRates);
      console.log(`[VolumeService] Converted ${volumeWithUsd.length} token entries to USD values`);
      console.log(`[VolumeService] First token with USD values:`, volumeWithUsd.length > 0 ? volumeWithUsd[0] : 'No data');

      // Process to VolumeByAddressResult format
      const formattedResult = volumeWithUsd.map(entry => ({
        timestamp: entry.timestamp,
        address: entry.address,
        symbol: entry.symbol,
        volumeUsd: entry.volumeUsd,
        feesUsd: entry.feesUsd,
      }));

      // Apply pagination and return
      const paginatedResult = formattedResult.slice(offset, offset + limit);
      console.log(`[VolumeService] Returning ${paginatedResult.length} token volume entries after pagination`);
      return paginatedResult;
    } catch (error) {
      console.error(`[VolumeService] Error executing SQL query:`, error);
      
      // Try an alternative query approach that's closer to the pairs aggregate query
      console.log(`[VolumeService] Trying alternative query approach...`);
      try {
        // First query to get data for tokens as target tokens
        const targetTokensQuery = `
          SELECT
            t."id" as "tokenId",
            t."address" as "address",
            t."symbol" as "symbol",
            t."decimals" as "decimals",
            SUM(CASE WHEN tte."targetTokenId" = t."id" THEN 
                "targetAmount" :: decimal / POWER(10, t."decimals")
              ELSE
                0
              END) as "bought",
            SUM(CASE WHEN 
                (tte."byTargetAmount" = FALSE AND tte."targetTokenId" = t."id")
              THEN
                "tradingFeeAmount" :: decimal / POWER(10, t."decimals")
              ELSE
                0
              END) as "fees"
          FROM
            "tokens-traded-events" tte
          JOIN tokens t
            ON t."id" IN (${tokenIds.join(', ')})
          WHERE
            tte."blockchainType" = '${deployment.blockchainType}'
            AND tte."exchangeId" = '${deployment.exchangeId}'
            AND tte."timestamp" >= '${startFormatted}'
            AND tte."timestamp" <= '${endFormatted}'
            ${ownerFilter}
          GROUP BY
            t."id",
            t."address",
            t."symbol",
            t."decimals"
        `;
        
        console.log(`[VolumeService] Executing alternative target tokens query`);
        const targetTokensResult = await this.dataSource.query(targetTokensQuery);
        console.log(`[VolumeService] Alternative query returned ${targetTokensResult?.length || 0} target token rows`);
        
        // Second query to get data for tokens as source tokens
        const sourceTokensQuery = `
          SELECT
            t."id" as "tokenId",
            t."address" as "address",
            t."symbol" as "symbol",
            t."decimals" as "decimals",
            SUM(CASE WHEN tte."sourceTokenId" = t."id" THEN 
                "sourceAmount" :: decimal / POWER(10, t."decimals")
              ELSE
                0
              END) as "sold",
            SUM(CASE WHEN 
                (tte."byTargetAmount" = TRUE AND tte."sourceTokenId" = t."id")
              THEN
                "tradingFeeAmount" :: decimal / POWER(10, t."decimals")
              ELSE
                0
              END) as "fees"
          FROM
            "tokens-traded-events" tte
          JOIN tokens t
            ON t."id" IN (${tokenIds.join(', ')})
          WHERE
            tte."blockchainType" = '${deployment.blockchainType}'
            AND tte."exchangeId" = '${deployment.exchangeId}'
            AND tte."timestamp" >= '${startFormatted}'
            AND tte."timestamp" <= '${endFormatted}'
            ${ownerFilter}
          GROUP BY
            t."id",
            t."address",
            t."symbol",
            t."decimals"
        `;
        
        console.log(`[VolumeService] Executing alternative source tokens query`);
        const sourceTokensResult = await this.dataSource.query(sourceTokensQuery);
        console.log(`[VolumeService] Alternative query returned ${sourceTokensResult?.length || 0} source token rows`);
        
        // Combine results from both queries
        const tokenMap = new Map();
        
        // Add target tokens data
        targetTokensResult.forEach(row => {
          const key = row.address.toLowerCase();
          tokenMap.set(key, {
            address: row.address,
            symbol: row.symbol,
            bought: parseFloat(row.bought) || 0,
            sold: 0, // Will be added from source tokens
            fees: parseFloat(row.fees) || 0,
            decimals: parseInt(row.decimals)
          });
        });
        
        // Add source tokens data, merging with target tokens where applicable
        sourceTokensResult.forEach(row => {
          const key = row.address.toLowerCase();
          if (tokenMap.has(key)) {
            // Update existing entry
            const existing = tokenMap.get(key);
            existing.sold = parseFloat(row.sold) || 0;
            existing.fees += parseFloat(row.fees) || 0;
          } else {
            // Add new entry
            tokenMap.set(key, {
              address: row.address,
              symbol: row.symbol,
              bought: 0,
              sold: parseFloat(row.sold) || 0,
              fees: parseFloat(row.fees) || 0,
              decimals: parseInt(row.decimals)
            });
          }
        });
        
        if (tokenMap.size === 0) {
          console.log(`[VolumeService] No tokens found with either approach`);
          return [];
        }
        
        console.log(`[VolumeService] Combined ${tokenMap.size} tokens from alternative queries`);
        
        // Convert to array and calculate total volume
        const tokenData = Array.from(tokenMap.values()).map(token => {
          const volume = new Decimal(token.bought).add(token.sold).toNumber();
          return {
            ...token,
            volume
          };
        });
        
        // Get USD rates for the tokens
        const tokenAddresses = tokenData.map(t => t.address.toLowerCase());
        console.log(`[VolumeService] Getting USD rates for ${tokenAddresses.length} tokens (alternative approach)`);
        
        const usdRates = await this.historicQuoteService.getUsdRates(
          deployment,
          tokenAddresses,
          startFormatted,
          endFormatted,
        );
        
        // Create a dictionary of USD rates
        const usdRateDict = usdRates.reduce((acc, rate) => {
          acc[rate.address.toLowerCase()] = rate.usd;
          return acc;
        }, {});
        
        // Format the final result
        const result = tokenData.map(token => {
          const usdRate = usdRateDict[token.address.toLowerCase()] || 0;
          const volumeUsd = new Decimal(token.volume).mul(usdRate).toNumber();
          const feesUsd = new Decimal(token.fees).mul(usdRate).toNumber();
          
          return {
            timestamp: moment().unix(),
            address: token.address,
            symbol: token.symbol,
            volumeUsd,
            feesUsd
          };
        });
        
        // Sort by volume and apply pagination
        result.sort((a, b) => b.volumeUsd - a.volumeUsd);
        
        const paginatedResult = result.slice(offset, offset + limit);
        console.log(`[VolumeService] Alternative approach returning ${paginatedResult.length} tokens`);
        
        return paginatedResult;
      } catch (alternativeError) {
        console.error(`[VolumeService] Alternative query approach also failed:`, alternativeError);
        return [];
      }
    }
  }

  // New method to get total volume data by pair without timestamp bucketing
  async getTotalVolumeByPair(
    deployment: Deployment,
    params: VolumePairsDto,
    tokens: TokensByAddress,
    pairs: PairsDictionary,
  ): Promise<EnhancedVolumeByPairResult[]> {
    // Use the same start/end parameters as the regular method
    const start = params.start ?? moment().subtract(1, 'year').unix();
    const end = params.end ?? moment().unix();
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 10000;

    const startFormatted = moment.unix(start).format('YYYY-MM-DD HH:mm:ss');
    const endFormatted = moment.unix(end).format('YYYY-MM-DD HH:mm:ss');

    console.log(`[VolumeService] Getting total volume by pair for period ${startFormatted} to ${endFormatted}`);

    // Get pair IDs from the params
    const pairIds = this.getPairIds(params, pairs);

    // If no pairs found, return empty result
    if (pairIds.length === 0) {
      console.log(`[VolumeService] No valid pair IDs found`);
      return [];
    }

    // Add owner filter if specified
    let ownerFilter = '';
    if (params.ownerId) {
      ownerFilter = `AND tte."trader" = '${params.ownerId}'`;
    }

    // Execute SQL query without time bucketing
    try {
      console.log(`[VolumeService] Executing SQL query for ${pairIds.length} pairs`);
      
      // Get pair metadata and volume data in a single query
      const result = await this.dataSource.query(`
        SELECT
          tte."pairId" AS "pairId",
          p."token0Id" as "token0Id", 
          p."token1Id" as "token1Id",
          t0."address" as "token0Address",
          t0."symbol" as "token0Symbol",
          t1."address" as "token1Address",
          t1."symbol" as "token1Symbol",
          SUM("targetAmount" :: decimal / POWER(10, "targetToken"."decimals")) AS "volume",
          SUM("tradingFeeAmount" :: decimal / POWER(10, "feeToken"."decimals")) AS "fees",
          "feeToken"."address" AS "feeAddress",
          "targetToken"."address" AS "targetAddress"
        FROM
          "tokens-traded-events" tte
        JOIN pairs p
          ON tte."pairId" = p."id"
        JOIN tokens t0
          ON p."token0Id" = t0."id"
        JOIN tokens t1
          ON p."token1Id" = t1."id"
        JOIN tokens "feeToken"
          ON (CASE 
                WHEN tte."byTargetAmount" = TRUE THEN tte."sourceTokenId"
                ELSE tte."targetTokenId"
              END) = "feeToken"."id"
        JOIN tokens "targetToken" 
          ON tte."targetTokenId" = "targetToken"."id"
        WHERE
          tte."blockchainType" = '${deployment.blockchainType}'
          AND tte."exchangeId" = '${deployment.exchangeId}'
          AND tte."pairId" IN (${pairIds.join(', ')})
          AND tte."timestamp" >= '${startFormatted}'
          AND tte."timestamp" <= '${endFormatted}'
          ${ownerFilter}
        GROUP BY
          tte."pairId",
          p."token0Id",
          p."token1Id",
          t0."address",
          t0."symbol",
          t1."address",
          t1."symbol",
          "feeToken"."address",
          "targetToken"."address"
        ORDER BY
          tte."pairId";
      `);

      console.log(`[VolumeService] SQL query returned ${result?.length || 0} rows for pairs`);

      // Format the result
      const volumeData = result.map((row) => ({
        // Use a fixed timestamp for all records (for compatibility)
        timestamp: moment().unix(),
        pairId: row.pairId,
        volume: parseFloat(row.volume) || 0,
        fees: parseFloat(row.fees) || 0,
        feeAddress: row.feeAddress,
        targetAddress: row.targetAddress,
        // Add token0 and token1 information
        token0Address: row.token0Address,
        token0Symbol: row.token0Symbol,
        token1Address: row.token1Address,
        token1Symbol: row.token1Symbol
      }));

      // Get USD rates for the tokens
      const uniqueTokenAddresses = new Set<string>();
      volumeData.forEach((volumeEntry) => {
        uniqueTokenAddresses.add(volumeEntry.feeAddress.toLowerCase());
        uniqueTokenAddresses.add(volumeEntry.targetAddress.toLowerCase());
        uniqueTokenAddresses.add(volumeEntry.token0Address.toLowerCase());
        uniqueTokenAddresses.add(volumeEntry.token1Address.toLowerCase());
      });

      const usdRates = await this.historicQuoteService.getUsdRates(
        deployment,
        Array.from(uniqueTokenAddresses),
        startFormatted,
        endFormatted,
      );

      // Create a rate dictionary for easier lookups
      const rateDict = usdRates.reduce((acc, rate) => {
        acc[rate.address.toLowerCase()] = rate.usd;
        return acc;
      }, {});

      // Process and map the data
      const formattedResult = [];
      
      // Group by pairId since we might have multiple rows per pair
      const pairGroups = {};
      volumeData.forEach(entry => {
        const pairId = entry.pairId;
        if (!pairGroups[pairId]) {
          pairGroups[pairId] = [];
        }
        pairGroups[pairId].push(entry);
      });
      
      // Process each pair
      for (const pairId in pairGroups) {
        const entries = pairGroups[pairId];
        if (entries.length === 0) continue;
        
        // Use the first entry for pair metadata
        const sample = entries[0];
        let totalVolumeUsd = 0;
        let totalFeesUsd = 0;
        let token0FeesUsd = 0;
        let token1FeesUsd = 0;
        
        // Process all entries for this pair
        entries.forEach(entry => {
          // Calculate USD values
          const targetRate = rateDict[entry.targetAddress.toLowerCase()] || 0;
          const feeRate = rateDict[entry.feeAddress.toLowerCase()] || 0;
          
          const volumeUsd = new Decimal(entry.volume).mul(targetRate).toNumber();
          const feesUsd = new Decimal(entry.fees).mul(feeRate).toNumber();
          
          totalVolumeUsd += volumeUsd;
          totalFeesUsd += feesUsd;
          
          // Attribute fees to the correct token
          if (entry.feeAddress.toLowerCase() === sample.token0Address.toLowerCase()) {
            token0FeesUsd += feesUsd;
          } else if (entry.feeAddress.toLowerCase() === sample.token1Address.toLowerCase()) {
            token1FeesUsd += feesUsd;
          } else {
            // Split the fee proportionally if we can't determine which token it belongs to
            token0FeesUsd += feesUsd / 2;
            token1FeesUsd += feesUsd / 2;
          }
        });
        
        // Create the formatted result
        formattedResult.push({
          timestamp: sample.timestamp,
          pairId: parseInt(pairId),
          volumeUsd: totalVolumeUsd,
          feesUsd: totalFeesUsd,
          token0: {
            address: sample.token0Address,
            symbol: sample.token0Symbol,
            feesUsd: token0FeesUsd
          },
          token1: {
            address: sample.token1Address,
            symbol: sample.token1Symbol,
            feesUsd: token1FeesUsd
          }
        });
      }
      
      // Sort by volume
      formattedResult.sort((a, b) => b.volumeUsd - a.volumeUsd);
      
      // Log a sample result
      if (formattedResult.length > 0) {
        console.log('[VolumeService] Sample result:', formattedResult[0]);
      }

      // Apply pagination and return
      return formattedResult.slice(offset, offset + limit);
    } catch (error) {
      console.error(`[VolumeService] Error executing SQL query for pairs:`, error);
      
      // Try the original query as a fallback
      try {
        console.log('[VolumeService] Trying fallback to original query');
        
        const result = await this.dataSource.query(`
          SELECT
            tte."pairId" AS "pairId",
            SUM("targetAmount" :: decimal / POWER(10, "targetToken"."decimals")) AS "volume",
            SUM("tradingFeeAmount" :: decimal / POWER(10, "feeToken"."decimals")) AS "fees",
            "feeToken"."address" AS "feeAddress",
            "targetToken"."address" AS "targetAddress"
          FROM
            "tokens-traded-events" tte
          JOIN tokens "feeToken"
            ON (CASE 
                  WHEN tte."byTargetAmount" = TRUE THEN tte."sourceTokenId"
                  ELSE tte."targetTokenId"
                END) = "feeToken"."id"
          JOIN tokens "targetToken" 
            ON tte."targetTokenId" = "targetToken"."id"
          WHERE
            tte."blockchainType" = '${deployment.blockchainType}'
            AND tte."exchangeId" = '${deployment.exchangeId}'
            AND tte."pairId" IN (${pairIds.join(', ')})
            AND tte."timestamp" >= '${startFormatted}'
            AND tte."timestamp" <= '${endFormatted}'
            ${ownerFilter}
          GROUP BY
            tte."pairId",
            "feeToken"."address",
            "targetToken"."address"
          ORDER BY
            tte."pairId";
        `);
        
        // Format the result
        const volumeData = result.map((row) => ({
          timestamp: moment().unix(),
          pairId: row.pairId,
          volume: parseFloat(row.volume) || 0,
          fees: parseFloat(row.fees) || 0,
          feeAddress: row.feeAddress,
          targetAddress: row.targetAddress,
        }));

        // Get USD rates for the tokens
        const uniqueTokenAddresses = new Set<string>();
        volumeData.forEach((volumeEntry) => {
          uniqueTokenAddresses.add(volumeEntry.feeAddress.toLowerCase());
          uniqueTokenAddresses.add(volumeEntry.targetAddress.toLowerCase());
        });

        const usdRates = await this.historicQuoteService.getUsdRates(
          deployment,
          Array.from(uniqueTokenAddresses),
          startFormatted,
          endFormatted,
        );

        // Convert to USD values
        const volumeWithUsd = this.mapVolumeDataToUsd(volumeData, usdRates);

        // Format as basic VolumeByPairResult (without token-specific fees)
        const basicResult = volumeWithUsd.map(entry => ({
          timestamp: entry.timestamp,
          pairId: entry.pairId,
          volumeUsd: entry.volumeUsd,
          feesUsd: entry.feesUsd,
        }));
        
        console.log('[VolumeService] Fallback query succeeded, returning basic results');
        return basicResult as any;
      } catch (fallbackError) {
        console.error('[VolumeService] Fallback query also failed:', fallbackError);
        return [];
      }
    }
  }

  private isVolumeTokensDto(params: any): params is VolumeTokensDto {
    return 'addresses' in params;
  }

  private isVolumePairsDto(params: any): params is VolumePairsDto {
    return 'pairs' in params;
  }

  private isTotalVolumeDto(params: any): params is VolumeTotalDto {
    return !('pairs' in params) && !('addresses' in params);
  }

  private async generateVolumeByAddress(
    deployment: Deployment,
    params: VolumeTokensDto | VolumeTotalDto,
    tokens: TokensByAddress,
    startFormatted: string,
    endFormatted: string,
  ): Promise<VolumeByAddressResult[]> {
    let tokenIds = [];
    if ('addresses' in params) {
      tokenIds = params.addresses.map((a) => tokens[a].id);
    } else {
      tokenIds = Object.values(tokens).map((t) => t.id);
    }

    let ownerFilter = '';
    if (params.ownerId) {
      ownerFilter = `AND tte."trader" = '${params.ownerId}'`;
    }

    const result = await this.dataSource.query(`
      WITH gapfilled_traded_events AS (
        SELECT
          time_bucket_gapfill('1 day', timestamp, '${startFormatted}', '${endFormatted}') AS "timestam",
          sum("targetAmount" :: decimal) AS "targetAmount",
          sum("tradingFeeAmount" :: decimal) AS "feeAmount",
          CASE
            WHEN tte."byTargetAmount" = TRUE THEN "sourceTokenId"
            ELSE "targetTokenId"
          END AS "feeTokenId",
          "feeToken"."address" AS "feeAddress",
          "feeToken"."symbol" AS "feeSymbol",
          "feeToken"."decimals" AS "feeDecimals",
          "targetToken"."address" AS "targetAddress",
          "targetToken"."symbol" AS "targetSymbol",
          "targetToken"."decimals" AS "targetDecimals"
        FROM
          "tokens-traded-events" tte
        JOIN tokens "feeToken"
          ON (CASE 
                WHEN tte."byTargetAmount" = TRUE THEN tte."sourceTokenId"
                ELSE tte."targetTokenId"
              END) = "feeToken"."id"
        JOIN tokens "targetToken" 
          ON tte."targetTokenId" = "targetToken"."id"
        WHERE
          tte."blockchainType" = '${deployment.blockchainType}'
          AND tte."exchangeId" = '${deployment.exchangeId}'
          AND tte."targetTokenId" IN (${tokenIds.join(', ')})
          ${ownerFilter}
        GROUP BY
          "timestam",
          "feeTokenId",
          "feeAddress",
          "feeSymbol",
          "feeDecimals",
          "targetAddress",
          "targetSymbol",
          "targetDecimals"
        ORDER BY
          "timestam" ASC
      )
      SELECT 
        "timestam",
        "feeAddress",
        "feeSymbol",
        "targetAddress",
        "targetSymbol",
        ("feeAmount" / POWER(10, "feeDecimals")) AS fees,
        ("targetAmount" / POWER(10, "targetDecimals")) AS volume,
        "feeAmount",
        "targetAmount"
      FROM
        gapfilled_traded_events
      WHERE
        "timestam" >= '${startFormatted}'
      GROUP BY
        "timestam",
        "feeAddress",
        "feeSymbol",
        "targetAddress",
        "targetSymbol",
        "feeAmount",
        "targetAmount",
        "feeDecimals",
        "targetDecimals"        
      ORDER BY
        "timestam",
        "targetAddress";      
    `);

    const volumeData = result.map((row) => ({
      timestamp: moment.utc(row.timestam).unix(),
      volume: parseFloat(row.volume) || 0,
      fees: parseFloat(row.fees) || 0,
      feeAddress: row.feeAddress,
      feeSymbol: row.feeSymbol,
      targetAddress: row.targetAddress,
      targetSymbol: row.targetSymbol,
    }));

    const uniqueTokenAddresses = new Set<string>();
    volumeData.forEach((volumeEntry) => {
      uniqueTokenAddresses.add(volumeEntry.feeAddress.toLowerCase());
      uniqueTokenAddresses.add(volumeEntry.targetAddress.toLowerCase());
    });

    const usdRates = await this.historicQuoteService.getUsdRates(
      deployment,
      Array.from(uniqueTokenAddresses),
      startFormatted,
      endFormatted,
    );

    return this.mapVolumeDataToUsd(volumeData, usdRates);
  }

  private async generateVolumeByPair(
    deployment: Deployment,
    params: VolumePairsDto,
    pairs: PairsDictionary,
    startFormatted: string,
    endFormatted: string,
  ): Promise<VolumeByPairResult[]> {
    const pairIds = this.getPairIds(params, pairs);

    let ownerFilter = '';
    if (params.ownerId) {
      ownerFilter = `AND tte."trader" = '${params.ownerId}'`;
    }

    const result = await this.dataSource.query(`
      WITH gapfilled_traded_events AS (
        SELECT
          time_bucket_gapfill('1 day', timestamp, '${startFormatted}', '${endFormatted}') AS "timestam",
          sum("targetAmount" :: decimal) AS "targetAmount",
          sum("tradingFeeAmount" :: decimal) AS "feeAmount",
          CASE
            WHEN tte."byTargetAmount" = TRUE THEN "sourceTokenId"
            ELSE "targetTokenId"
          END AS "feeTokenId",
          "feeToken"."address" AS "feeAddress",
          "feeToken"."symbol" AS "feeSymbol",
          "feeToken"."decimals" AS "feeDecimals",
          "targetToken"."address" AS "targetAddress",
          "targetToken"."symbol" AS "targetSymbol",
          "targetToken"."decimals" AS "targetDecimals",
          "pairId"
        FROM
          "tokens-traded-events" tte
        JOIN tokens "feeToken"
          ON (CASE 
                WHEN tte."byTargetAmount" = TRUE THEN tte."sourceTokenId"
                ELSE tte."targetTokenId"
              END) = "feeToken"."id"
        JOIN tokens "targetToken" 
          ON tte."targetTokenId" = "targetToken"."id"
        WHERE
          tte."blockchainType" = '${deployment.blockchainType}'
          AND tte."exchangeId" = '${deployment.exchangeId}'
          AND tte."pairId" IN (${pairIds.join(', ')})
          ${ownerFilter}
        GROUP BY
          "timestam",
          "feeTokenId",
          "feeAddress",
          "feeSymbol",
          "feeDecimals",
          "targetAddress",
          "targetSymbol",
          "targetDecimals",
          "pairId"
        ORDER BY
          "timestam" ASC
      )
      SELECT 
        "timestam",
        "feeAddress",
        "feeSymbol",
        "targetAddress",
        "targetSymbol",
        ("feeAmount" / POWER(10, "feeDecimals")) AS fees,
        ("targetAmount" / POWER(10, "targetDecimals")) AS volume,
        "feeAmount",
        "targetAmount",
        "pairId"
      FROM
        gapfilled_traded_events
      WHERE
        "timestam" >= '${startFormatted}'
      GROUP BY
        "timestam",
        "feeAddress",
        "feeSymbol",
        "targetAddress",
        "targetSymbol",
        "feeAmount",
        "targetAmount",
        "feeDecimals",
        "targetDecimals",
        "pairId"
      ORDER BY
        "timestam",
        "targetAddress"      
    `);

    const volumeData = result.map((row) => ({
      timestamp: moment.utc(row.timestam).unix(),
      volume: parseFloat(row.volume) || 0,
      fees: parseFloat(row.fees) || 0,
      pairId: row.pairId,
      feeAddress: row.feeAddress,
      targetAddress: row.targetAddress,
    }));

    const uniqueTokenAddresses = new Set<string>();
    volumeData.forEach((volumeEntry) => {
      uniqueTokenAddresses.add(volumeEntry.feeAddress.toLowerCase());
      uniqueTokenAddresses.add(volumeEntry.targetAddress.toLowerCase());
    });

    const usdRates = await this.historicQuoteService.getUsdRates(
      deployment,
      Array.from(uniqueTokenAddresses),
      startFormatted,
      endFormatted,
    );

    const volumeWithUsd = this.mapVolumeDataToUsd(volumeData, usdRates);

    return this.accumulateByPairAndTimestamp(volumeWithUsd);
  }

  private mapVolumeDataToUsd(volumeData: any[], usdRates: any[]): any[] {
    // Create a dictionary for quick lookup of USD rates by address
    const usdRateDict: Record<string, number> = usdRates.reduce((acc, usdEntry) => {
      acc[usdEntry.address.toLowerCase()] = usdEntry.usd;
      return acc;
    }, {});

    // Map volume data to include USD values
    return volumeData.map((entry) => {
      const volumeUsdRate = usdRateDict[entry.targetAddress.toLowerCase()] || 0;
      const feesUsdRate = usdRateDict[entry.feeAddress.toLowerCase()] || 0;

      const volumeUsd = new Decimal(entry.volume).mul(volumeUsdRate).toNumber();
      const feesUsd = new Decimal(entry.fees).mul(feesUsdRate).toNumber();

      return {
        ...entry,
        volumeUsd,
        feesUsd,
      };
    });
  }

  private accumulateByAddressAndTimestamp(volumeWithUsd: any[]): VolumeByAddressResult[] {
    const groupedResult = volumeWithUsd.reduce((acc, volumeEntry) => {
      const groupKey = `${volumeEntry.targetAddress}_${volumeEntry.timestamp}`;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          timestamp: volumeEntry.timestamp,
          address: volumeEntry.targetAddress,
          symbol: volumeEntry.targetSymbol,
          volumeUsd: new Decimal(0),
          feesUsd: new Decimal(0),
          volume: new Decimal(0),
          fees: new Decimal(0),
        };
      }

      acc[groupKey].volumeUsd = acc[groupKey].volumeUsd.add(volumeEntry.volumeUsd);
      acc[groupKey].feesUsd = acc[groupKey].feesUsd.add(volumeEntry.feesUsd);
      acc[groupKey].volume = acc[groupKey].volume.add(volumeEntry.volume);
      acc[groupKey].fees = acc[groupKey].fees.add(volumeEntry.fees);

      return acc;
    }, {});

    return Object.values(groupedResult).map((group: any) => ({
      timestamp: group.timestamp,
      address: group.address,
      symbol: group.symbol,
      volumeUsd: group.volumeUsd.toNumber(),
      feesUsd: group.feesUsd.toNumber(),
      volume: group.volume.toNumber(),
      fees: group.fees.toNumber(),
    }));
  }

  private accumulateByTimestamp(volumeWithUsd: any[]): VolumeResult[] {
    const groupedResult = volumeWithUsd.reduce((acc, volumeEntry) => {
      const groupKey = `${volumeEntry.timestamp}`;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          timestamp: volumeEntry.timestamp,
          address: volumeEntry.targetAddress,
          symbol: volumeEntry.targetSymbol,
          volumeUsd: new Decimal(0),
          feesUsd: new Decimal(0),
        };
      }

      acc[groupKey].volumeUsd = acc[groupKey].volumeUsd.add(volumeEntry.volumeUsd);
      acc[groupKey].feesUsd = acc[groupKey].feesUsd.add(volumeEntry.feesUsd);

      return acc;
    }, {});

    return Object.values(groupedResult).map((group: any) => ({
      timestamp: group.timestamp,
      volumeUsd: group.volumeUsd.toNumber(),
      feesUsd: group.feesUsd.toNumber(),
    }));
  }

  private accumulateByPairAndTimestamp(volumeWithUsd: any[]): VolumeByPairResult[] {
    const groupedResult = volumeWithUsd.reduce((acc, volumeEntry) => {
      const groupKey = `${volumeEntry.pairId}_${volumeEntry.timestamp}`;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          timestamp: volumeEntry.timestamp,
          pairId: volumeEntry.pairId,
          volumeUsd: new Decimal(0),
          feesUsd: new Decimal(0),
          // Add token0 and token1 if they exist in the input
          ...(volumeEntry.token0 && {
            token0: {
              address: volumeEntry.token0.address,
              symbol: volumeEntry.token0.symbol,
              feesUsd: new Decimal(0)
            }
          }),
          ...(volumeEntry.token1 && {
            token1: {
              address: volumeEntry.token1.address,
              symbol: volumeEntry.token1.symbol,
              feesUsd: new Decimal(0)
            }
          })
        };
      }

      acc[groupKey].volumeUsd = acc[groupKey].volumeUsd.add(volumeEntry.volumeUsd);
      acc[groupKey].feesUsd = acc[groupKey].feesUsd.add(volumeEntry.feesUsd);
      
      // Also accumulate token-specific fees if they exist
      if (volumeEntry.token0 && acc[groupKey].token0) {
        acc[groupKey].token0.feesUsd = acc[groupKey].token0.feesUsd.add(volumeEntry.token0.feesUsd || 0);
      }
      
      if (volumeEntry.token1 && acc[groupKey].token1) {
        acc[groupKey].token1.feesUsd = acc[groupKey].token1.feesUsd.add(volumeEntry.token1.feesUsd || 0);
      }

      return acc;
    }, {});

    return Object.values(groupedResult).map((group: any) => {
      const result: any = {
        timestamp: group.timestamp,
        pairId: group.pairId,
        volumeUsd: group.volumeUsd.toNumber(),
        feesUsd: group.feesUsd.toNumber()
      };
      
      // Add token0 and token1 if they exist
      if (group.token0) {
        result.token0 = {
          address: group.token0.address,
          symbol: group.token0.symbol,
          feesUsd: group.token0.feesUsd.toNumber()
        };
      }
      
      if (group.token1) {
        result.token1 = {
          address: group.token1.address,
          symbol: group.token1.symbol,
          feesUsd: group.token1.feesUsd.toNumber()
        };
      }
      
      return result;
    });
  }

  private getPairIds(params: VolumePairsDto, pairs: PairsDictionary): number[] {
    const pairIds: number[] = [];
    for (const { token0, token1 } of params.pairs) {
      const pair = pairs[token0]?.[token1];
      if (pair) {
        pairIds.push(pair.id);
      } else {
      }
    }
    return pairIds;
  }
}
