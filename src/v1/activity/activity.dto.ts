import { IsOptional, IsNumber, IsString, IsIn, IsArray, ArrayNotEmpty } from 'class-validator';
import { formatEthereumAddress } from '../../isAddress.validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const validActions = ['sell', 'buy', 'create', 'deposit', 'withdraw', 'transfer', 'edit', 'delete', 'pause'];

export class ActivityDto {
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: 'Comma-separated list of strategy IDs to filter by'
  })
  strategyIds?: string;

  @IsOptional()
  @Transform((value) => formatEthereumAddress(value))
  @ApiPropertyOptional({
    type: String,
    description: 'Ethereum address of the strategy owner'
  })
  ownerId?: string;

  @IsOptional()
  @Transform((value) => formatEthereumAddress(value))
  @ApiPropertyOptional({
    type: String,
    description: 'First token address to filter by'
  })
  token0?: string;

  @IsOptional()
  @Transform((value) => formatEthereumAddress(value))
  @ApiPropertyOptional({
    type: String,
    description: 'Second token address to filter by'
  })
  token1?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiPropertyOptional({
    type: Number,
    description: 'Start timestamp in seconds'
  })
  start?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiPropertyOptional({
    type: Number,
    description: 'End timestamp in seconds'
  })
  end?: number;

  @IsOptional()
  @Transform(
    ({ value }) => {
      if (typeof value === 'string') {
        return value.split(',').map((action: string) => action.trim());
      }
      return value;
    },
    { toClassOnly: true },
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(validActions, {
    each: true,
    message: `each value in actions must be one of the following values: ${validActions.join(
      ', ',
    )}. alternatively, remove the param to receive all data`,
  })
  @ApiPropertyOptional({
    type: [String],
    description: 'List of comma-separated actions',
    enum: validActions
  })
  actions?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: 'Comma-separated list of trading pairs to filter by'
  })
  pairs?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiPropertyOptional({
    type: Number,
    description: 'Maximum number of records to return',
    default: 100
  })
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiPropertyOptional({
    type: Number,
    description: 'Number of records to skip',
    default: 0
  })
  offset?: number;
}
