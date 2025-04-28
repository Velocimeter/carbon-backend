import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Block } from '../../../block/block.entity';
import { BlockchainType, ExchangeId } from '../../../deployment/deployment.service';

@Entity({ name: 'set_referrer_discount_share_events' })
@Unique(['transactionIndex', 'transactionHash', 'logIndex'])
export class SetReferrerDiscountShareEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  blockchainType: BlockchainType;

  @Column()
  @Index()
  exchangeId: ExchangeId;

  @Index()
  @ManyToOne(() => Block, { eager: true })
  block: Block;

  @Column({ type: 'varchar', length: 42 })
  referrer: string;

  @Column({ type: 'varchar' })
  discountShare: string;

  @Column({ name: 'chain_id', type: 'int' })
  @Index()
  chainId: number;

  @Column()
  transactionIndex: number;

  @Column()
  transactionHash: string;

  @Column()
  logIndex: number;

  @Column()
  @Index()
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 