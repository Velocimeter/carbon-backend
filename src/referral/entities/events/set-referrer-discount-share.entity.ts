import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('set_referrer_discount_share_events')
export class SetReferrerDiscountShareEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 42 })
  referrer: string;

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