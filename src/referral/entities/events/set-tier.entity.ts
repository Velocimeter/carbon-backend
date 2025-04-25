import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('set_tier_events')
export class SetTierEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tier_id', type: 'varchar', length: 78 })
  tierId: string;

  @Column({ name: 'total_rebate', type: 'varchar', length: 78 })
  totalRebate: string;

  @Column({ name: 'discount_share', type: 'varchar', length: 78 })
  discountShare: string;

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