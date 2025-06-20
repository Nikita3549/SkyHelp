import { Module } from '@nestjs/common';
import { DocusignService } from './docusign.service';
import { DocusignController } from './docusign.controller';
import { TokenModule } from '../token/token.module';
import { ClaimsModule } from '../claims/claims.module';

@Module({
    imports: [TokenModule, ClaimsModule],
    providers: [DocusignService],
    controllers: [DocusignController],
})
export class DocusignModule {}
