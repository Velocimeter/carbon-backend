import { Module, forwardRef } from '@nestjs/common';
import { CodexService } from './codex.service';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from '../token/token.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pair } from '../pair/pair.entity';

@Module({
  imports: [ConfigModule, forwardRef(() => TokenModule), TypeOrmModule.forFeature([Pair])],
  providers: [CodexService],
  exports: [CodexService],
})
export class CodexModule {}