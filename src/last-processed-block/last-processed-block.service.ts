import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LastProcessedBlock } from './last-processed-block.entity';
import { Deployment } from '../deployment/deployment.service';

@Injectable()
export class LastProcessedBlockService {
  private readonly logger = new Logger(LastProcessedBlockService.name);

  constructor(
    @InjectRepository(LastProcessedBlock)
    private lastProcessedBlock: Repository<LastProcessedBlock>,
  ) {}

  async update(param: string, block: number): Promise<any> {
    let lastProcessed = await this.lastProcessedBlock.findOneBy({ param });
    if (!lastProcessed) {
      lastProcessed = this.lastProcessedBlock.create({
        param,
        block,
      });
      await this.lastProcessedBlock.save(lastProcessed);
      this.logger.debug(`Created new record for ${param} with block ${block}`);
    } else if (block > lastProcessed.block) {
      await this.lastProcessedBlock.update(lastProcessed.id, {
        block,
      });
      this.logger.debug(`Updated ${param} from block ${lastProcessed.block} to ${block}`);
    }
  }

  async get(param: string): Promise<number> {
    const lastProcessed = await this.lastProcessedBlock.findOneBy({ param });
    return lastProcessed ? lastProcessed.block : null;
  }

  async getOrInit(param: string, initTo?: number): Promise<number> {
    const _initTo = initTo || 1;
    const lastProcessed = await this.lastProcessedBlock.findOneBy({ param });
    const result = lastProcessed ? lastProcessed.block : _initTo;
    
    return result;
  }

  async firstUnprocessedBlockNumber(): Promise<number> {
    this.logger.debug('Getting first unprocessed block number across multiple entities');
    const startBlock = 1;
    const entities = [
      'blocks',
      'pair-created-events',
      'strategy-created-events',
      'trading-fee-ppm-updated-events',
      'pair-trading-fee-ppm-updated-events',
      'voucher-transfer-events',
    ];
    const values = await Promise.all(
      entities.map((e) => {
        return this.getOrInit(e, startBlock);
      }),
    );

    const result = Math.min(...values);
    this.logger.debug(`First unprocessed block across all entities: ${result}`);
    return result;
  }

  async getState(deployment: Deployment): Promise<any> {
    this.logger.debug(`Getting state for deployment ${deployment.blockchainType}-${deployment.exchangeId}`);
    const state = await this.lastProcessedBlock.query(`
      SELECT MIN("last_processed_block"."block") AS "lastBlock", MIN("updatedAt") AS timestamp 
      FROM last_processed_block
      WHERE "param" LIKE '%${deployment.blockchainType}-${deployment.exchangeId}%'
      AND "param" NOT LIKE '%notifications%'
    `);

    return state[0];
  }
}
