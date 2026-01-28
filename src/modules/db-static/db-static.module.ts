import { Module } from '@nestjs/common';
import { DbStaticService } from './db-static.service';

@Module({
    providers: [DbStaticService],
    exports: [DbStaticService],
})
export class DbStaticModule {}
