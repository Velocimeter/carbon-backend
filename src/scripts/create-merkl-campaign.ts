import 'reflect-metadata';
import dataSource from '../typeorm.config';
import { Repository } from 'typeorm';
import { Campaign } from '../merkl/entities/campaign.entity';
import { Pair } from '../pair/pair.entity';
import { BlockchainType, ExchangeId } from '../deployment/deployment.service';

interface CliArgs {
  blockchainType: BlockchainType;
  exchangeId: ExchangeId;
  pair?: string; // e.g., ETH_USDC
  pairId?: number; // alternative to pair
  rewardAmount: string; // as string for precision
  rewardTokenAddress: string;
  start: string; // ISO date
  end: string; // ISO date
  opportunityName: string;
  active?: string | boolean; // default true
}

function parseArgs(argv: string[]): Partial<CliArgs> {
  const result: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const eqIdx = token.indexOf('=');
      if (eqIdx > -1) {
        const key = token.slice(2, eqIdx);
        const value = token.slice(eqIdx + 1);
        result[key] = value;
      } else {
        const key = token.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
          result[key] = next;
          i++;
        } else {
          result[key] = 'true';
        }
      }
    }
  }
  return result as Partial<CliArgs>;
}

function assertPresent<T>(value: T | undefined, message: string): T {
  if (value === undefined || value === null || value === '') {
    throw new Error(message);
  }
  return value as T;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  const blockchainType = assertPresent(args.blockchainType as BlockchainType, '--blockchainType is required');
  const exchangeId = assertPresent(args.exchangeId as ExchangeId, '--exchangeId is required');
  const rewardAmount = assertPresent(args.rewardAmount, '--rewardAmount is required');
  const rewardTokenAddress = assertPresent(args.rewardTokenAddress, '--rewardTokenAddress is required');
  const start = assertPresent(args.start, '--start is required (ISO date)');
  const end = assertPresent(args.end, '--end is required (ISO date)');
  const opportunityName = assertPresent(args.opportunityName, '--opportunityName is required');

  const isActive: boolean = String(args.active ?? 'true') === 'true';

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid start/end date. Provide ISO-8601 strings.');
  }
  if (endDate.getTime() < startDate.getTime()) {
    throw new Error('end must be greater than or equal to start');
  }

  await dataSource.initialize();

  try {
    const campaignRepo: Repository<Campaign> = dataSource.getRepository(Campaign);
    const pairRepo: Repository<Pair> = dataSource.getRepository(Pair);

    let pairId: number | undefined = args.pairId ? Number(args.pairId) : undefined;
    if (!pairId && args.pair) {
      const pairName = args.pair;
      const pair = await pairRepo.findOne({
        where: {
          name: pairName,
          blockchainType: blockchainType as any,
          exchangeId: exchangeId as any,
        },
      });
      if (!pair) {
        throw new Error(`Pair not found for name=${pairName}, blockchainType=${blockchainType}, exchangeId=${exchangeId}`);
      }
      pairId = pair.id;
    }

    if (!pairId) {
      throw new Error('Provide --pair <NAME> or --pairId <ID>');
    }

    // Overlap check (active campaigns on same pair)
    const existing = await campaignRepo.findOne({
      where: {
        blockchainType: blockchainType as any,
        exchangeId: exchangeId as any,
        pairId: pairId,
        isActive: true,
      },
    });

    if (existing) {
      const hasOverlap = !(endDate <= existing.startDate || startDate >= existing.endDate);
      if (hasOverlap) {
        throw new Error('Active campaign already exists for this pair with overlapping time period');
      }
    }

    const newCampaign: Partial<Campaign> = {
      blockchainType: blockchainType as any,
      exchangeId: exchangeId as any,
      pairId: pairId,
      rewardAmount,
      rewardTokenAddress,
      startDate,
      endDate,
      opportunityName,
      isActive,
    };

    const created = campaignRepo.create(newCampaign);
    const saved = await campaignRepo.save(created);

    // Eager relation on Campaign will hydrate pair if present
    // Re-read to ensure full entity (optional)
    const persisted = await campaignRepo.findOne({ where: { id: saved.id } });

    // Output
    // eslint-disable-next-line no-console
    console.log('Created Merkl campaign:', {
      id: persisted?.id ?? saved.id,
      blockchainType,
      exchangeId,
      pairId,
      rewardAmount,
      rewardTokenAddress,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      opportunityName,
      isActive,
    });
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to create Merkl campaign:', err?.message || err);
  process.exit(1);
});


