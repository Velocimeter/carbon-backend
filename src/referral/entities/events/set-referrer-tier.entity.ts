import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('set_referrer_tier_events')
export class SetReferrerTierEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 42 })
  referrer: string;

  @Column({ name: 'tier_id', type: 'varchar', length: 78 })
  tierId: string;

  @Column({ name: 'chain_id', type: 'int' })
  @Index()
  chainId: number;

  @Column({ name: 'transaction_hash', type: 'varchar', length: 66 })
  transactionHash: string;

  @Column({ name: 'block_number', type: 'float' })
  blockNumber: number;

  @Column({ type: 'float' })
  timestamp: number;
} 