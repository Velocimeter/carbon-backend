import { ApiProperty } from '@nestjs/swagger';

class StrategyPriceConfig {
  @ApiProperty({ description: 'Budget amount', example: '1000000000000000000' })
  budget: string;

  @ApiProperty({ description: 'Minimum price', example: '1000000' })
  min: string;

  @ApiProperty({ description: 'Maximum price', example: '2000000' })
  max: string;

  @ApiProperty({ description: 'Marginal price', example: '1500000' })
  marginal: string;
}

class StrategyInfo {
  @ApiProperty({ description: 'Strategy ID', example: '123' })
  id: string;

  @ApiProperty({ description: 'Strategy owner address', example: '0x1234...' })
  owner: string;

  @ApiProperty({ description: 'Base token address', example: '0xabcd...' })
  base: string;

  @ApiProperty({ description: 'Quote token address', example: '0xefgh...' })
  quote: string;

  @ApiProperty({ type: StrategyPriceConfig })
  buy: StrategyPriceConfig;

  @ApiProperty({ type: StrategyPriceConfig })
  sell: StrategyPriceConfig;
}

class PriceChanges {
  @ApiProperty({ description: 'Budget change amount', example: '100000000', required: false })
  budget?: string;

  @ApiProperty({ description: 'Minimum price change', example: '50000', required: false })
  min?: string;

  @ApiProperty({ description: 'Maximum price change', example: '100000', required: false })
  max?: string;

  @ApiProperty({ description: 'Marginal price change', example: '75000', required: false })
  marginal?: string;
}

class Changes {
  @ApiProperty({ type: PriceChanges, required: false })
  buy?: PriceChanges;

  @ApiProperty({ type: PriceChanges, required: false })
  sell?: PriceChanges;

  @ApiProperty({ description: 'Previous owner address', example: '0x5678...', required: false })
  owner?: string;
}

export class ActivityResponseDto {
  @ApiProperty({ enum: ['sell', 'buy', 'create', 'deposit', 'withdraw', 'transfer', 'edit', 'delete', 'pause'] })
  action: string;

  @ApiProperty({ type: StrategyInfo })
  strategy: StrategyInfo;

  @ApiProperty({ description: 'Block number', example: 12345678 })
  blockNumber: number;

  @ApiProperty({ description: 'Transaction hash', example: '0xabcd...' })
  txHash: string;

  @ApiProperty({ description: 'Unix timestamp in seconds', example: 1634567890 })
  timestamp: number;

  @ApiProperty({ type: Changes, required: false })
  changes?: Changes;
}

export class ActivityMetaResponseDto {
  @ApiProperty({ description: 'Total number of activities', example: 1000 })
  total: number;

  @ApiProperty({ description: 'List of unique actions', type: [String], example: ['buy', 'sell', 'create'] })
  actions: string[];
}
