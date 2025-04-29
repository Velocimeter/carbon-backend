import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { BlockchainType } from '../deployment/deployment.service';

@Entity('referral_states')
@Unique(['trader', 'chainId'])
export class ReferralState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  blockchainType: BlockchainType;

  @Column()
  @Index()
  exchangeId: string;

  @Column()
  @Index()
  trader: string;

  @Column()
  @Index()
  code: string;

  @Column({ name: 'code_decoded', nullable: true })
  codeDecoded: string;

  @Column()
  @Index()
  owner: string;

  @Column()
  tierId: string;

  @Column()
  totalRebate: string;

  @Column()
  discountShare: string;

  @Column({ name: 'chain_id' })
  @Index()
  chainId: number;

  @Column()
  @Index()
  timestamp: Date;

  @Column({ name: 'last_processed_block' })
  lastProcessedBlock: number;

  @Column({ name: 'block_id', nullable: true })
  blockId: number;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;
} 