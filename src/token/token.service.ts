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

// Hardcoded token metadata for Sonic blockchain
const SONIC_TOKEN_METADATA = {
  '0x29219dd400f2Bf60E5a23d13Be72B486D4038894': {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6
  }
  // Add more tokens as needed
};

export interface TokensByAddress {
  [address: string]: Token;
}

// First define an interface for the address data
interface AddressData {
  address: string;
  blockId: number;
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
  ) {}

  async update(endBlock: number, deployment: Deployment): Promise<void> {
    console.log(`[Token] dunkstokens Starting token update for ${deployment.blockchainType} from block ${endBlock}`);

    // First ensure hardcoded tokens exist for Sonic
    if (deployment.blockchainType === BlockchainType.Sonic) {
      console.log('[Token] dunkstokens Checking hardcoded Sonic tokens');
      await this.addHardcodedTokens(deployment);
    }

    const lastProcessedEntity = `${deployment.blockchainType}-${deployment.exchangeId}-tokens`;

    // figure out start block
    const lastProcessedBlockNumber = await this.lastProcessedBlockService.getOrInit(lastProcessedEntity, 1);
    console.log(`[Token] dunkstokens Last processed block: ${lastProcessedBlockNumber}`);

    // Define batch size
    const batchSize = 10000;
    let currentBlock = lastProcessedBlockNumber;

    while (currentBlock < endBlock) {
      const nextBlock = Math.min(currentBlock + batchSize, endBlock);
      console.log(`[Token] dunkstokens Processing blocks ${currentBlock} to ${nextBlock}`);

      // fetch pair created events
      const newPairCreatedEvents = await this.pairCreatedEventService.get(currentBlock, nextBlock, deployment);
      console.log(`[Token] dunkstokens Found ${newPairCreatedEvents.length} pair created events`);

      // fetch arbitrage executed events
      const newArbitrageExecutedEvents = await this.arbitrageExecutedEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );
      console.log(`[Token] dunkstokens Found ${newArbitrageExecutedEvents.length} arbitrage executed events`);

      // fetch vortex tokens traded events
      const newVortexTokensTradedEvents = await this.vortexTokensTradedEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );
      console.log(`[Token] dunkstokens Found ${newVortexTokensTradedEvents.length} vortex tokens traded events`);

      // fetch vortex trading reset events
      const newVortexTradingResetEvents = await this.vortexTradingResetEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );
      console.log(`[Token] dunkstokens Found ${newVortexTradingResetEvents.length} vortex trading reset events`);

      // fetch vortex funds withdrawn events
      const newVortexFundsWithdrawnEvents = await this.vortexFundsWithdrawnEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );
      console.log(`[Token] dunkstokens Found ${newVortexFundsWithdrawnEvents.length} vortex funds withdrawn events`);

      // fetch protection removed events
      const newProtectionRemovedEvents = await this.protectionRemovedEventService.get(
        currentBlock,
        nextBlock,
        deployment,
      );
      console.log(`[Token] dunkstokens Found ${newProtectionRemovedEvents.length} protection removed events`);

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

      console.log(`[Token] dunkstokens Total unique addresses found: ${new Set(addressesData.map(d => d.address)).size}`);

      // Sort by blockId to ensure we process in chronological order
      addressesData.sort((a, b) => a.blockId - b.blockId);

      // create new tokens
      const addressesBatches = _.chunk(addressesData, 1000);
      console.log(`[Token] dunkstokens Processing ${addressesBatches.length} batches of addresses`);

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

    console.log(`[Token] dunkstokens Completed token update for ${deployment.blockchainType} up to block ${endBlock}`);
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

  private async createFromAddresses(addresses: string[], deployment: Deployment) {
    console.log(`[Token] dunkstokens Creating tokens from ${addresses.length} addresses for ${deployment.blockchainType}`);

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
      console.log('[Token] dunkstokens No new tokens to create');
      return;
    }

    console.log(`[Token] dunkstokens Fetching metadata for ${newAddresses.length} new tokens`);

    // fetch metadata for all tokens
    const decimals = await this.getDecimals(newAddresses, deployment);
    const symbols = await this.getSymbols(newAddresses, deployment);
    const names = await this.getNames(newAddresses, deployment);

    // create new tokens
    const newTokens = [];
    for (let i = 0; i < newAddresses.length; i++) {
      console.log(`[Token] dunkstokens Creating token: ${newAddresses[i]} (${symbols[i]}) with ${decimals[i]} decimals`);
      newTokens.push(
        this.token.create({
          address: newAddresses[i],
          symbol: symbols[i],
          decimals: decimals[i],
          name: names[i],
          blockchainType: deployment.blockchainType,
          exchangeId: deployment.exchangeId,
        }),
      );
    }
    await this.token.save(newTokens);
    console.log(`[Token] dunkstokens Created ${newTokens.length} new tokens for ${deployment.blockchainType}`);
  }

  private async getSymbols(addresses: string[], deployment: Deployment): Promise<string[]> {
    console.log(`[Token] dunkstokens Fetching symbols for ${addresses.length} tokens`);
    const symbols = await this.harvesterService.stringsWithMulticall(addresses, symbolABI, 'symbol', deployment);
    const index = addresses.indexOf(deployment.gasToken.address);
    if (index >= 0) {
      symbols[index] = deployment.gasToken.symbol;
      console.log(`[Token] dunkstokens Set gas token symbol to ${deployment.gasToken.symbol}`);
    }
    return symbols;
  }

  private async getNames(addresses: string[], deployment: Deployment): Promise<string[]> {
    console.log(`[Token] dunkstokens Fetching names for ${addresses.length} tokens`);
    const names = await this.harvesterService.stringsWithMulticall(addresses, nameABI, 'name', deployment);
    const index = addresses.indexOf(deployment.gasToken.address);
    if (index >= 0) {
      names[index] = deployment.gasToken.name;
      console.log(`[Token] dunkstokens Set gas token name to ${deployment.gasToken.name}`);
    }
    return names;
  }

  private async getDecimals(addresses: string[], deployment: Deployment): Promise<number[]> {
    console.log(`[Token] dunkstokens Fetching decimals for ${addresses.length} tokens`);
    const decimals = await this.harvesterService.integersWithMulticall(addresses, decimalsABI, 'decimals', deployment);
    const index = addresses.indexOf(deployment.gasToken.address);
    if (index >= 0) {
      decimals[index] = 18;
      console.log('[Token] dunkstokens Set gas token decimals to 18');
    }
    return decimals;
  }

  async getTokensByBlockchainType(blockchainType: BlockchainType): Promise<Token[]> {
    console.log(`[Token] dunkstokens Fetching all tokens for ${blockchainType}`);
    return this.token.find({
      where: { blockchainType },
    });
  }

  async addHardcodedTokens(deployment: Deployment) {
    if (deployment.blockchainType !== BlockchainType.Sonic) {
      console.log(`[Token] dunkstokens Skipping hardcoded tokens for non-Sonic blockchain: ${deployment.blockchainType}`);
      return;
    }

    console.log('[Token] dunkstokens Adding hardcoded Sonic tokens');
    const tokens = [];
    for (const [address, metadata] of Object.entries(SONIC_TOKEN_METADATA)) {
      // Check if token already exists
      const existing = await this.token.findOne({
        where: {
          blockchainType: deployment.blockchainType,
          exchangeId: deployment.exchangeId,
          address: address
        }
      });

      if (!existing) {
        console.log(`[Token] dunkstokens Adding hardcoded token: ${address} (${metadata.symbol})`);
        tokens.push(
          this.token.create({
            address,
            symbol: metadata.symbol,
            decimals: metadata.decimals,
            name: metadata.name,
            blockchainType: deployment.blockchainType,
            exchangeId: deployment.exchangeId,
          })
        );
      } else {
        console.log(`[Token] dunkstokens Hardcoded token already exists: ${address} (${metadata.symbol})`);
      }
    }

    if (tokens.length > 0) {
      await this.token.save(tokens);
      console.log(`[Token] dunkstokens Added ${tokens.length} hardcoded Sonic tokens`);
    } else {
      console.log('[Token] dunkstokens No new hardcoded tokens to add');
    }
  }
}
