import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('set_code_owner_events')
export class SetCodeOwnerEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 42 })
  account: string;

  @Column({ name: 'new_account', type: 'varchar', length: 42 })
  newAccount: string;

  @Column({ type: 'varchar', length: 66 })
  code: string;

  @Column({ name: 'code_decoded', type: 'varchar', length: 255, nullable: true })
  codeDecoded: string;

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