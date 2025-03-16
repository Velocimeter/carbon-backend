import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { decimalsABI, nameABI, symbolABI } from '../abis/erc20.abi';
import * as _ from 'lodash';
import { Token } from './token.entity';
import { HarvesterService } from '../harvester/harvester.service';
import { LastProcessedBlockService } from '../last-processed-block/last-processed-block.service';
import { PairCreatedEventService } from '../events/pair-created-event/pair-created-event.service';
import { BlockchainType, Deployment } from '../deployment/deployment.service';
import { VortexTokensTradedEventService } from '../events/vortex-tokens-traded-event/vortex-tokens-traded-event.service';
import { ArbitrageExecutedEventService } from '../events/arbitrage-executed-event/arbitrage-executed-event.service';
import { VortexTradingResetEventService } from '../events/vortex-trading-reset-event/vortex-trading-reset-event.service';
import { VortexFundsWithdrawnEventService } from '../events/vortex-funds-withdrawn-event/vortex-funds-withdrawn-event.service';
import { ProtectionRemovedEventService } from '../events/protection-removed-event/protection-removed-event.service';
import { CodexService, NETWORK_IDS } from '../codex/codex.service';

export interface TokensByAddress {
  [address: string]: Token;
}

// First define an interface for the address data
interface AddressData {
  address: string;
  blockId: number;
}

interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
}

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token) private token: Repository<Token>,
    private harvesterService: HarvesterService,
    private lastProcessedBlockService: LastProcessedBlockService,
    private pairCreatedEventService: PairCreatedEventService,
    private vortexTokensTradedEventService: VortexTokensTradedEventService,
    private arbitrageExecutedEventService: ArbitrageExecutedEventService,
    private vortexTradingResetEventService: VortexTradingResetEventService,
    private vortexFundsWithdrawnEventService: VortexFundsWithdrawnEventService,
    private protectionRemovedEventService: ProtectionRemovedEventService,
    private codexService: CodexService,
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    const lastProcessedEntity = `${deployment.blockchainType}-${deployment.exchangeId}-tokens`;

    // figure out start block
    const lastProcessedBlockNumber = await this.lastProcessedBlockService.getOrInit(lastProcessedEntity, 1);

    // Define batch size
    const batchSize = 10000;
    let currentBlock = lastProcessedBlockNumber;

    while (currentBlock < endBlock) {
      const nextBlock = Math.min(currentBlock + batchSize, endBlock);

      // fetch pair created events
      const newPairCreatedEvents = await this.pairCreatedEventService.get(currentBlock, nextBlock, deployment);

      // fetch arbitrage executed events
      const newArbitrageExecutedEvents = await this.arbitrageExecutedEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );

      // fetch vortex tokens traded events
      const newVortexTokensTradedEvents = await this.vortexTokensTradedEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );

      // fetch vortex trading reset events
      const newVortexTradingResetEvents = await this.vortexTradingResetEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );

      // fetch vortex funds withdrawn events
      const newVortexFundsWithdrawnEvents = await this.vortexFundsWithdrawnEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );

      // fetch protection removed events
      const newProtectionRemovedEvents = await this.protectionRemovedEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );

      // Create array of AddressData objects with both address and blockId
      const addressesData: AddressData[] = [
        ...newPairCreatedEvents.map((e) => ({ address: e.token0, blockId: e.block.id })),
        ...newPairCreatedEvents.map((e) => ({ address: e.token1, blockId: e.block.id })),
        ...newVortexTokensTradedEvents.map((e) => ({ address: e.token, blockId: e.block.id })),
        ...newArbitrageExecutedEvents
          .map((e) => e.sourceTokens.map((token) => ({ address: token, blockId: e.block.id })))
          .flat(),
        ...newArbitrageExecutedEvents
          .map((e) => e.tokenPath.map((token) => ({ address: token, blockId: e.block.id })))
          .flat(),
        ...newVortexTradingResetEvents.map((e) => ({ address: e.token, blockId: e.block.id })),
        ...newVortexFundsWithdrawnEvents
          .map((e) => e.tokens.map((token) => ({ address: token, blockId: e.block.id })))
          .flat(),
        ...newProtectionRemovedEvents.map((e) => ({ address: e.poolToken, blockId: e.block.id })),
        ...newProtectionRemovedEvents.map((e) => ({ address: e.reserveToken, blockId: e.block.id })),
      ];

      // Sort by blockId to ensure we process in chronological order
      addressesData.sort((a, b) => a.blockId - b.blockId);

      // create new tokens
      const addressesBatches = _.chunk(addressesData, 1000);
      for (const addressesBatch of addressesBatches) {
        // Extract just the addresses for token creation
        const addresses = addressesBatch.map((data) => data.address);
        await this.createFromAddresses(addresses, deployment);

        // Update using the last block ID from this batch
        await this.lastProcessedBlockService.update(
          lastProcessedEntity,
          addressesBatch[addressesBatch.length - 1].blockId,
        );
      }

      // Move to the next batch
      currentBlock = nextBlock;
    }

    // update last processed block number
    await this.lastProcessedBlockService.update(lastProcessedEntity, endBlock);
  }

  async allByAddress(deployment: Deployment): Promise<TokensByAddress> {
    const all = await this.token.find({
      where: {
        blockchainType: deployment.blockchainType,
        exchangeId: deployment.exchangeId,
      },
    });
    const tokensByAddress = {};
    all.forEach((t) => (tokensByAddress[t.address] = t));
    return tokensByAddress;
  }

  async all(deployment: Deployment): Promise<Token[]> {
    return this.token.find({
      where: {
        blockchainType: deployment.blockchainType,
        exchangeId: deployment.exchangeId,
      },
    });
  }

  private async getTokenMetadataFromCodex(addresses: string[], deployment: Deployment): Promise<Map<string, TokenMetadata>> {
    const networkId = NETWORK_IDS[deployment.blockchainType];
    if (!networkId) {
      console.log(`[metadatatokens] No Codex network ID for ${deployment.blockchainType}, falling back to multicall`);
      return new Map();
    }

    try {
      console.log(`[metadatatokens] Fetching token metadata from Codex for ${addresses.length} addresses on ${deployment.blockchainType}`);
      const results = await this.codexService.getTokenMetadata(networkId, addresses);

      const metadataMap = new Map<string, TokenMetadata>();
      
      for (const result of results) {
        // Add defensive checks and detailed logging
        if (!result) {
          console.warn(`[metadatatokens] Received null/undefined result from Codex`);
          continue;
        }
        if (!result.token) {
          console.warn(`[metadatatokens] Missing token data in Codex result:`, result);
          continue;
        }
        const { token } = result;
        if (!token.address) {
          console.warn(`[metadatatokens] Missing address in Codex token data:`, token);
          continue;
        }

        // Only add to map if we have all required fields
        if (token.symbol && token.name && token.decimals != null) {
          metadataMap.set(token.address.toLowerCase(), {
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
          });
        } else {
          console.warn(`[metadatatokens] Incomplete token metadata from Codex for ${token.address}:`, {
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
          });
        }
      }

      console.log(`[metadatatokens] Found metadata for ${metadataMap.size} tokens from Codex`);
      return metadataMap;
    } catch (error) {
      console.warn(`[metadatatokens] Failed to fetch token metadata from Codex: ${error.message}`);
      return new Map();
    }
  }

  private async createFromAddresses(addresses: string[], deployment: Deployment) {
    try {
      console.log(`[metadatatokens] Starting token creation for ${addresses.length} addresses on ${deployment.blockchainType}`);
      
      // map all token addresses in an array
      const addressesSet = new Set(addresses);

      // filter out already existing tokens
      const currentlyExistingTokens: any = await this.token.find({
        where: { blockchainType: deployment.blockchainType, exchangeId: deployment.exchangeId },
      });
      const currentlyExistingAddresses = currentlyExistingTokens.map((t) => t.address);

      const newAddresses = [];
      Array.from(addressesSet).forEach((t) => {
        if (!currentlyExistingAddresses.includes(t)) {
          newAddresses.push(t);
        }
      });

      if (newAddresses.length === 0) {
        console.log(`[metadatatokens] No new tokens to create for ${deployment.blockchainType}`);
        return;
      }

      console.log(`[metadatatokens] Fetching metadata for ${newAddresses.length} tokens on ${deployment.blockchainType}`);

      // Try to get metadata from Codex first
      const codexMetadata = await this.getTokenMetadataFromCodex(newAddresses, deployment);
      
      // For tokens not found in Codex, fetch metadata from chain
      const missingAddresses = newAddresses.filter(addr => !codexMetadata.has(addr.toLowerCase()));
      
      let chainDecimals: number[] = [], chainSymbols: string[] = [], chainNames: string[] = [];
      if (missingAddresses.length > 0) {
        console.log(`[metadatatokens] Fetching metadata from chain for ${missingAddresses.length} tokens`);
        try {
          chainDecimals = await this.getDecimals(missingAddresses, deployment);
          chainSymbols = await this.getSymbols(missingAddresses, deployment);
          chainNames = await this.getNames(missingAddresses, deployment);
        } catch (error) {
          console.warn(`[metadatatokens] Failed to fetch on-chain metadata: ${error.message}`);
        }
      }

      // create new tokens
      const newTokens = [];
      const skippedTokens = [];
      
      for (let i = 0; i < newAddresses.length; i++) {
        const address = newAddresses[i];
        const codexData = codexMetadata.get(address.toLowerCase());
        
        let metadata: TokenMetadata | null = null;
        
        if (codexData) {
          metadata = codexData;
        } else {
          const chainIndex = missingAddresses.indexOf(address);
          if (chainIndex >= 0 && chainDecimals[chainIndex] && chainSymbols[chainIndex] && chainNames[chainIndex]) {
            metadata = {
              decimals: chainDecimals[chainIndex],
              symbol: chainSymbols[chainIndex],
              name: chainNames[chainIndex],
            };
          }
        }
        
        if (!metadata) {
          const message = `[metadatatokens] Skipping token creation for ${address} due to missing metadata`;
          console.warn(message);
          skippedTokens.push(address);
          continue;
        }

        newTokens.push(
          this.token.create({
            address: address,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
            name: metadata.name,
            blockchainType: deployment.blockchainType,
            exchangeId: deployment.exchangeId,
          }),
        );
      }

      if (newTokens.length > 0) {
        try {
          await this.token.save(newTokens);
          console.log(`[metadatatokens] Successfully created ${newTokens.length} tokens for ${deployment.blockchainType}`);
          if (skippedTokens.length > 0) {
            console.warn(`[metadatatokens] Skipped ${skippedTokens.length} tokens: ${skippedTokens.join(', ')}`);
          }
        } catch (saveError) {
          const dbError = new Error(`[metadatatokens] Database error while saving tokens for ${deployment.blockchainType}: ${saveError.message}`);
          console.error(dbError);
          throw dbError;
        }
      } else {
        console.warn(`[metadatatokens] No valid tokens to create for ${deployment.blockchainType} (${skippedTokens.length} skipped)`);
      }
    } catch (error) {
      const finalError = new Error(`[metadatatokens] Failed to create tokens for ${deployment.blockchainType}: ${error.message}`);
      console.error(finalError);
      throw finalError;
    }
  }

  private async getSymbols(addresses: string[], deployment: Deployment): Promise<string[]> {
    const symbols = await this.harvesterService.stringsWithMulticall(addresses, symbolABI, 'symbol', deployment);
    const index = addresses.indexOf(deployment.gasToken.address);
    if (index >= 0) {
      symbols[index] = deployment.gasToken.symbol;
    }
    return symbols;
  }

  private async getNames(addresses: string[], deployment: Deployment): Promise<string[]> {
    const names = await this.harvesterService.stringsWithMulticall(addresses, nameABI, 'name', deployment);
    const index = addresses.indexOf(deployment.gasToken.address);
    if (index >= 0) {
      names[index] = deployment.gasToken.name;
    }
    return names;
  }

  private async getDecimals(addresses: string[], deployment: Deployment): Promise<number[]> {
    const decimals = await this.harvesterService.integersWithMulticall(addresses, decimalsABI, 'decimals', deployment);
    const index = addresses.indexOf(deployment.gasToken.address);
    if (index >= 0) {
      decimals[index] = 18;
    }
    return decimals;
  }

  async getTokensByBlockchainType(blockchainType: BlockchainType): Promise<Token[]> {
    return this.token.find({
      where: { blockchainType },
    });
  }
}