import { Module } from '@nestjs/common';
import { TokenModule } from '../token/token.module';
import { GenerateJwtController } from './generate-jwt.controller';

@Module({
    imports: [TokenModule],
    controllers: [GenerateJwtController],
})
export class GenerateJwtModule {}
