import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { BlockchainType } from '../deployment/deployment.service';

@Entity('referral_codes')
@Unique(['code', 'chainId'])
export class ReferralCode {
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
  code: string;

  @Column({ nullable: true })
  codeDecoded: string;

  @Column()
  @Index()
  owner: string;

  @Column()
  @Index()
  chainId: number;

  @Column()
  transactionHash: string;

  @Column('float')
  blockNumber: number;

  @Column()
  @Index()
  timestamp: Date;

  @Column({ nullable: true })
  transactionIndex: number;

  @Column({ nullable: true })
  logIndex: number;

  @Column({ nullable: true })
  blockId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
