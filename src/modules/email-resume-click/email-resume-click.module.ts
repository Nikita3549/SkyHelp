import { Module } from '@nestjs/common';
import { EmailResumeClickController } from './email-resume-click.controller';
import { EmailResumeClickService } from './email-resume-click.service';
import { TokenModule } from '../token/token.module';

@Module({
    imports: [TokenModule],
    controllers: [EmailResumeClickController],
    providers: [EmailResumeClickService],
    exports: [EmailResumeClickService],
})
export class EmailResumeClickModule {}
