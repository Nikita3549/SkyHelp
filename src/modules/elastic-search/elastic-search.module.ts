import { Module, Provider } from '@nestjs/common';
import { SearchSyncService } from './search-sync.service';
import { Client } from '@elastic/elasticsearch';
import { ELASTIC_CLIENT_TOKEN } from './constants/elastic-client.token';
import * as process from 'process';
import { isProd } from '../../common/utils/isProd';
import { DbStaticModule } from '../db-static/db-static.module';

const ElasticClient: Provider = {
    provide: ELASTIC_CLIENT_TOKEN,
    useFactory: () => {
        if (!isProd()) return null;

        return new Client({
            node: `http://${process.env.ELASTICSEARCH_HOST!}:9200`,
            auth: {
                username: process.env.ELASTICSEARCH_USER!,
                password: process.env.ELASTICSEARCH_PASSWORD!,
            },
        });
    },
};

@Module({
    imports: [DbStaticModule],
    providers: [SearchSyncService, ElasticClient],
    exports: [ElasticClient],
})
export class ElasticSearchModule {}
