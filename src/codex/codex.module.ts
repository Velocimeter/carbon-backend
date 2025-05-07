import { Module, forwardRef } from '@nestjs/common';
import { CodexService } from './codex.service';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from '../token/token.module';

@Module({
  imports: [ConfigModule, forwardRef(() => TokenModule)],
  providers: [CodexService],
  exports: [CodexService],
})
export class CodexModule {}