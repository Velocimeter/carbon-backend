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
import { Block } from '../../block/block.entity';
import { BlockchainType, ExchangeId } from '../../deployment/deployment.service';

@Entity({ name: 'vortex-funds-withdrawn-events' })
@Unique(['transactionIndex', 'transactionHash', 'logIndex'])
export class VortexFundsWithdrawnEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: BlockchainType })
  @Index()
  blockchainType: BlockchainType;

  @Column({ type: 'enum', enum: ExchangeId })
  @Index()
  exchangeId: ExchangeId;

  @Index()
  @ManyToOne(() => Block, { eager: true })
  block: Block;

  @Column()
  @Index()
  caller: string;

  @Column()
  @Index()
  target: string;

  @Column('text', { array: true })
  tokens: string[];

  @Column('text', { array: true })
  amounts: string[];

  @Column()
  transactionIndex: number;

  @Column()
  transactionHash: string;

  @Column()
  @Index()
  timestamp: Date;

  @Column()
  logIndex: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
