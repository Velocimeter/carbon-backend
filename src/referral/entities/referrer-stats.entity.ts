import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('referrer_stats')
export class ReferrerStats {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 42 })
  @Index()
  address: string;
  
  @Column({ type: 'varchar', length: 78 })
  volume: string;
  
  @Column({ type: 'varchar', length: 78 })
  rebates: string;
  
  @Column({ type: 'int' })
  referrals: number;

  @Column({ name: 'chain_id', type: 'int' })
  @Index()
  chainId: number;

  @Column({ name: 'last_updated', type: 'float' })
  lastUpdated: number;
} 