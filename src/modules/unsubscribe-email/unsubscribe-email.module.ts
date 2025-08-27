import { Module } from '@nestjs/common';
import { UnsubscribeEmailController } from './unsubscribe-email.controller';
import { UnsubscribeEmailService } from './unsubscribe-email.service';
import { TokenModule } from '../token/token.module';

@Module({
    imports: [TokenModule],
    controllers: [UnsubscribeEmailController],
    providers: [UnsubscribeEmailService],
    exports: [UnsubscribeEmailService],
})
export class UnsubscribeEmailModule {}
