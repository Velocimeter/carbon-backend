import { IsOptional, IsNumber, Min, Max, IsString, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { formatEthereumAddress, IsAddress } from '../../isAddress.validator';

class VolumePair {
  @IsAddress()
  @IsString()
  token0: string;

  @IsAddress()
  @IsString()
  token1: string;
}

export class VolumePairsDto {
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VolumePair)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((pair: string) => {
        const [token0, token1] = pair.split('_').map((addr: string, index: number) => {
          const key = index === 0 ? 'token0' : 'token1';
          return formatEthereumAddress({ value: addr.trim(), key });
        });
        return { token0, token1 };
      });
    }
    return value;
  })
  @ApiProperty({
    type: String, // Display as a string in Swagger
    description: 'Comma-separated list of token pairs in the format address1_address2, address3_address4. For /volume/pairs/aggregate endpoint, this is optional - if not provided, all pairs will be used.',
    required: false
  })
  @IsOptional()
  pairs: VolumePair[]; // Internally processed as an array of TokenPair objects

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
    description: 'Whether to aggregate results without timestamp segmentation. Only needed for the /volume/pairs endpoint, not needed for /volume/pairs/aggregate which is always non-timestamped.',
  })
  aggregateTotal?: boolean;
}
