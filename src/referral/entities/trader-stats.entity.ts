import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('trader_stats')
export class TraderStats {
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
  trades: number;

  @Column({ name: 'chain_id', type: 'int' })
  @Index()
  chainId: number;

  @Column({ name: 'last_updated', type: 'float' })
  lastUpdated: number;
} 