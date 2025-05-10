import { IsOptional, IsNumber, Min, Max, IsString, IsArray, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { formatEthereumAddress, IsAddress } from '../../isAddress.validator';

export class VolumeTotalDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiPropertyOptional({
    type: Number,
    description: 'Start timestamp in seconds',
  })
  start?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiPropertyOptional({
    type: Number,
    description: 'End timestamp in seconds',
  })
  end?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @ApiPropertyOptional({
    type: Number,
    description: 'Offset for pagination',
  })
  offset?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  @Max(10000)
  @ApiPropertyOptional({
    type: Number,
    description: 'Limit for pagination',
    default: 10000,
  })
  limit?: number;

  @IsOptional()
  @Transform((value) => formatEthereumAddress(value))
  @ApiPropertyOptional({
    type: String,
    description: 'Wallet or contract address. Filters results by this address.',
  })
  ownerId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @ApiPropertyOptional({
    type: Boolean,
    description: 'Whether to aggregate results without timestamp segmentation. Only needed for the /volume endpoint, not needed for /volume/tokens/aggregate which is always non-timestamped.',
  })
  aggregateTotal?: boolean;
  
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => value ? (
    typeof value === 'string' ? value.split(',').map((addr: string) => addr.trim()) : value
  ) : [])
  @IsAddress({ each: true })
  @IsString({ each: true })
  @ApiPropertyOptional({
    type: String,
    description: 'Array of token addresses or comma-separated list of addresses to filter. Optional for tokens/aggregate endpoint - if not provided, all tokens will be used.',
  })
  addresses?: string[];
}
