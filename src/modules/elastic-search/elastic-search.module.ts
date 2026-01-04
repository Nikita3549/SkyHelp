import { Module, Provider } from '@nestjs/common';
import { SearchSyncService } from './search-sync.service';
import { Client } from '@elastic/elasticsearch';
import { ELASTIC_CLIENT_TOKEN } from './constants/elastic-client.token';
import * as process from 'process';

const ElasticClient: Provider = {
    provide: ELASTIC_CLIENT_TOKEN,
    useFactory: () => {
        return new Client({
            node: `http://${process.env.ELASTICSEARCH_HOST!}:${process.env.ELASTICSEARCH_PORT!}`,
            auth: {
                username: process.env.ELASTICSEARCH_USER!,
                password: process.env.ELASTICSEARCH_PASSWORD!,
            },
            maxRetries: 10,
            requestTimeout: 60000,
            sniffOnStart: false,
        });
    },
};

@Module({
    providers: [SearchSyncService, ElasticClient],
    exports: [ElasticClient],
})
export class ElasticSearchModule {}
