import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LastProcessedBlock } from './last-processed-block.entity';
import { Deployment } from '../deployment/deployment.service';
import { sleep } from '../utilities';

@Injectable()
export class LastProcessedBlockService {
  private queryDelayMs = 60000;
  private lastQueryTime: { [key: string]: number } = {};
  private readonly logger = new Logger(LastProcessedBlockService.name);

  constructor(
    @InjectRepository(LastProcessedBlock)
    private lastProcessedBlock: Repository<LastProcessedBlock>,
    private configService: ConfigService,
  ) {
    this.logger.log(`Initialized with query delay of ${this.queryDelayMs/1000}s (1 minute)`);
  }

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
    const now = Date.now();
    
    // If first query for this param, initialize with current time
    if (!this.lastQueryTime[param]) {
      this.lastQueryTime[param] = now;
      this.logger.log(`First query for ${param}`);
    }
    
    const timeSinceLastQuery = now - this.lastQueryTime[param];
    const secondsSinceLastQuery = (timeSinceLastQuery / 1000).toFixed(1);
    
    // Get caller info for better logging
    const stack = new Error().stack;
    const callerInfo = stack.split('\n')[2].trim();

    // Log EVERY query with time since last query in seconds
    this.logger.log(
      `Query for ${param} - ${secondsSinceLastQuery}s since last query. Called from: ${callerInfo}`
    );

    // Apply throttling if needed
    if (timeSinceLastQuery < this.queryDelayMs) {
      const waitTime = this.queryDelayMs - timeSinceLastQuery;
      const waitTimeSeconds = (waitTime / 1000).toFixed(1);
      this.logger.log(
        `THROTTLING: ${param} - waiting ${waitTimeSeconds}s before next query.`
      );
      await sleep(waitTime);
    }

    this.lastQueryTime[param] = Date.now();
    
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
