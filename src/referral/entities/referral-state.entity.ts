import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Block } from '../../block/block.entity';
import { BlockchainType, ExchangeId } from '../../deployment/deployment.service';

@Entity({ name: 'referral_states' })
@Unique(['trader', 'chainId'])  // Each trader can only have one active code per chain
@Index(['code', 'chainId'])     // For looking up all traders using a code
@Index(['owner', 'chainId'])    // For looking up all codes/traders for an owner
export class ReferralState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  blockchainType: BlockchainType;

  @Column()
  @Index()
  exchangeId: ExchangeId;

  @Column({ type: 'varchar', length: 42 })
  @Index()
  trader: string;

  @Column({ type: 'varchar', length: 66 })
  @Index()
  code: string;

  @Column({ name: 'code_decoded', type: 'varchar', length: 255, nullable: true })
  codeDecoded: string;

  @Column({ type: 'varchar', length: 42 })
  @Index()
  owner: string;

  @Column({ type: 'varchar' })
  tierId: string;

  @Column({ type: 'varchar' })
  totalRebate: string;

  @Column({ type: 'varchar' })
  discountShare: string;

  @Column({ name: 'chain_id', type: 'int' })
  @Index()
  chainId: number;

  @Column()
  @Index()
  timestamp: Date;

  @ManyToOne(() => Block)
  @JoinColumn({ name: 'block_id' })
  block: Block;

  @Column({ name: 'last_processed_block', type: 'int' })
  lastProcessedBlock: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 