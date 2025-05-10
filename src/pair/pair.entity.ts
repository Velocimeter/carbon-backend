import { TokensTradedEvent } from '../events/tokens-traded-event/tokens-traded-event.entity';
import { Block } from '../block/block.entity';
import { Token } from '../token/token.entity';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BlockchainType, ExchangeId } from '../deployment/deployment.service';

@Entity({ name: 'pairs' })
export class Pair {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  blockchainType: BlockchainType;

  @Column()
  @Index()
  exchangeId: ExchangeId;

  @ManyToOne(() => Block, { eager: true })
  block: Block;

  @ManyToOne(() => Token, { eager: true })
  token0: Token;

  @ManyToOne(() => Token, { eager: true })
  token1: Token;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TokensTradedEvent, (tokenTradedEvent) => tokenTradedEvent.pair)
  tokensTradedEvents: TokensTradedEvent[];

  // Virtual fields from aggregation (not stored in DB)
  activityCount?: number;
  uniqueTraders?: number;
  lastActivityTime?: Date;
  token0_bought?: string;
  token0_sold?: string;
  token0_fees?: string;
  token1_bought?: string;
  token1_sold?: string;
  token1_fees?: string;
}
