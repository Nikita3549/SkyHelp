import { Module } from '@nestjs/common';
import {
    GenerateLinksController,
    PublicGenerateLinksController,
} from './generate-links.controller';
import { GenerateLinksService } from './generate-links.service';
import { TokenModule } from '../token/token.module';
import { ClaimModule } from '../claim/claim.module';

@Module({
    imports: [TokenModule, ClaimModule],
    controllers: [GenerateLinksController, PublicGenerateLinksController],
    providers: [GenerateLinksService],
})
export class GenerateLinksModule {}
