import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { formatEthereumAddress } from '../isAddress.validator';

export class PairQueryDto {
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
}
