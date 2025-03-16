import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Block } from './block.entity';
import { Repository } from 'typeorm';
import * as _ from 'lodash';
import Web3 from 'web3';
import { Deployment } from '../deployment/deployment.service';
import { sleep } from '../utilities';

export interface BlocksDictionary {
  [id: number]: Date;
}

@Injectable()
export class BlockService {
  constructor(@InjectRepository(Block) private block: Repository<Block>) {}

  private async update(blockNumbers: number[], deployment: Deployment): Promise<void> {
    console.log(`[actdunks][${deployment.blockchainType}] Starting block update for ${blockNumbers.length} blocks`);
    let missingBlocks = await this.getMissingBlocks(blockNumbers, deployment);
    console.log(`[actdunks][${deployment.blockchainType}] Found ${missingBlocks.length} missing blocks to fetch`);

    while (missingBlocks.length > 0) {
      await this.fetchAndStore(missingBlocks, deployment);
      missingBlocks = await this.getMissingBlocks(blockNumbers, deployment);
      if (missingBlocks.length > 0) {
        console.log(`[actdunks][${deployment.blockchainType}] Still need to fetch ${missingBlocks.length} blocks`);
      }
    }
    console.log(`[actdunks][${deployment.blockchainType}] Completed block update`);
  }

  private async getMissingBlocks(blockNumbers: number[], deployment: Deployment): Promise<number[]> {
    console.log(`[actdunks][${deployment.blockchainType}] Checking for missing blocks in range ${Math.min(...blockNumbers)} to ${Math.max(...blockNumbers)}`);
    const existingBlocks = await this.block
      .createQueryBuilder()
      .where('id IN (:...ids)', { ids: blockNumbers })
      .andWhere('"blockchainType" = :blockchainType', { blockchainType: deployment.blockchainType })
      .getMany();

    const existingBlockIds = existingBlocks.map((block) => block.id);
    const missingBlocks = _.difference(blockNumbers, existingBlockIds);
    console.log(`[actdunks][${deployment.blockchainType}] Found ${missingBlocks.length} missing blocks out of ${blockNumbers.length} requested`);
    if (missingBlocks.length > 0) {
      console.log(`[actdunks][${deployment.blockchainType}] Missing block range: ${Math.min(...missingBlocks)} to ${Math.max(...missingBlocks)}`);
    }
    return missingBlocks;
  }

  private async fetchAndStore(blocks: Array<number>, deployment: Deployment): Promise<void> {
    console.log(`[actdunks][${deployment.blockchainType}] Fetching and storing ${blocks.length} blocks`);
    const batches = _.chunk(blocks, 100);
    const limit = (await import('p-limit')).default;
    const concurrencyLimit = limit(deployment.harvestConcurrency);

    for (let i = 0; i < batches.length; i++) {
      const newBlocks = [];
      console.log(`[actdunks][${deployment.blockchainType}] Processing batch ${i + 1}/${batches.length} (${batches[i].length} blocks)`);

      await Promise.all(
        batches[i].map((blockNumber) =>
          concurrencyLimit(async () => {
            try {
              const blockchainData = await this.getBlockchainData(blockNumber, deployment);
              const newBlock = this.block.create({
                id: Number(blockchainData.number),
                timestamp: new Date(parseInt(blockchainData.timestamp) * 1000),
                blockchainType: deployment.blockchainType,
              });
              newBlocks.push(newBlock);

              await sleep(deployment.harvestSleep || 0);
            } catch (error) {
              console.log(`[actdunks][${deployment.blockchainType}] Error fetching block ${blockNumber}:`, error);
            }
          }),
        ),
      );

      await this.block.save(newBlocks);
      console.log(`[actdunks][${deployment.blockchainType}] Saved ${newBlocks.length} blocks from batch ${i + 1}`);
    }
  }

  private async getBlockchainData(blockNumber: number, deployment: Deployment): Promise<any> {
    console.log(`[actdunks][${deployment.blockchainType}] Fetching block ${blockNumber} from RPC endpoint`);
    try {
      const web3 = new Web3(deployment.rpcEndpoint);
      const block = await web3.eth.getBlock(blockNumber);
      if (!block) {
        console.error(`[actdunks][${deployment.blockchainType}] Block ${blockNumber} not found on chain`);
        throw new Error(`Block ${blockNumber} not found`);
      }
      console.log(`[actdunks][${deployment.blockchainType}] Successfully fetched block ${blockNumber}, timestamp: ${new Date(parseInt(block.timestamp.toString()) * 1000).toISOString()}`);
      return block;
    } catch (error) {
      console.error(`[actdunks][${deployment.blockchainType}] Failed to fetch block ${blockNumber}:`, error);
      throw error;
    }
  }

  async getBlocks(from: number, to: number, deployment: Deployment): Promise<any> {
    console.log(`[actdunks][${deployment.blockchainType}] Getting blocks from ${from} to ${to}`);
    const blocks = await this.block
      .createQueryBuilder()
      .select(['"id"', '"timestamp"'])
      .where('"id" >= :from', { from })
      .andWhere('"id" <= :to', { to })
      .andWhere('"blockchainType" = :blockchainType', { blockchainType: deployment.blockchainType })
      .orderBy('"id"', 'ASC')
      .execute();
    console.log(`[actdunks][${deployment.blockchainType}] Found ${blocks.length} blocks`);
    return blocks;
  }

  async getBlock(number: number, deployment: Deployment): Promise<Block> {
    console.log(`[actdunks][${deployment.blockchainType}] Getting block ${number}`);
    return this.block.findOne({ where: { id: number, blockchainType: deployment.blockchainType } });
  }

  async getLastBlock(deployment: Deployment): Promise<Block> {
    console.log(`[actdunks][${deployment.blockchainType}] Getting last block`);
    const block = await this.block
      .createQueryBuilder()
      .where('"blockchainType" = :blockchainType', { blockchainType: deployment.blockchainType })
      .orderBy('"id"', 'DESC')
      .limit(1)
      .getOne();
    if (block) {
      console.log(`[actdunks][${deployment.blockchainType}] Last block is ${block.id}`);
    } else {
      console.log(`[actdunks][${deployment.blockchainType}] No blocks found`);
    }
    return block;
  }

  async getBlocksDictionary(blockNumbers: number[], deployment: Deployment): Promise<BlocksDictionary> {
    console.log(`[actdunks][${deployment.blockchainType}] Building block dictionary for ${blockNumbers.length} blocks`);
    await this.update(blockNumbers, deployment);

    const blocksInDb = await this.block
      .createQueryBuilder()
      .where('id IN (:...blockNumbers)', { blockNumbers })
      .andWhere('"blockchainType" = :blockchainType', { blockchainType: deployment.blockchainType })
      .getMany();

    const result: BlocksDictionary = {};
    blocksInDb.forEach((block) => {
      result[block.id] = block.timestamp;
    });

    console.log(`[actdunks][${deployment.blockchainType}] Built dictionary with ${Object.keys(result).length} blocks`);
    return result;
  }

  async getLastBlockFromBlockchain(deployment: Deployment): Promise<number> {
    console.log(`[actdunks][${deployment.blockchainType}] Getting latest block from blockchain at ${deployment.rpcEndpoint}`);
    try {
      const web3 = new Web3(deployment.rpcEndpoint);
      const blockNumber = await web3.eth.getBlockNumber();
      console.log(`[actdunks][${deployment.blockchainType}] Latest block is ${blockNumber}`);
      return Number(blockNumber);
    } catch (error) {
      console.error(`[actdunks][${deployment.blockchainType}] Failed to get latest block:`, error);
      throw error;
    }
  }

  async getFirst(deployment: Deployment): Promise<Block> {
    console.log(`[actdunks][${deployment.blockchainType}] Getting first block`);
    const block = await this.block
      .createQueryBuilder('blocks')
      .where('"blockchainType" = :blockchainType', { blockchainType: deployment.blockchainType })
      .orderBy('id', 'ASC')
      .limit(1)
      .getOne();
    if (block) {
      console.log(`[actdunks][${deployment.blockchainType}] First block is ${block.id}`);
    } else {
      console.log(`[actdunks][${deployment.blockchainType}] No blocks found`);
    }
    return block;
  }
}
