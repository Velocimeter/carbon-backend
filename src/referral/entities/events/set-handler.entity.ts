import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('set_handler_events')
export class SetHandlerEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 42 })
  handler: string;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;

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