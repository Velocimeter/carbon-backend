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

@Entity({ name: 'register_code_events' })
@Unique(['transactionIndex', 'transactionHash', 'logIndex'])
@Index(['code', 'blockchainType', 'exchangeId'])
@Index(['referrer', 'blockchainType', 'exchangeId'])
export class RegisterCodeEvent {
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

  @Column({ type: 'varchar', length: 66 })
  @Index()
  code: string;

  @Column({ name: 'code_decoded', type: 'varchar', length: 255, nullable: true })
  codeDecoded: string;

  @Column({ type: 'varchar', length: 42 })
  @Index()
  referrer: string;

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