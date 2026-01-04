import { Module, Provider } from '@nestjs/common';
import { SearchSyncService } from './search-sync.service';
import { Client } from '@elastic/elasticsearch';
import { ELASTIC_CLIENT_TOKEN } from './constants/elastic-client.token';

const ElasticClient: Provider = {
    provide: ELASTIC_CLIENT_TOKEN,
    useFactory: () => {
        return new Client({ node: 'http://localhost:9200' });
    },
};

@Module({
    providers: [SearchSyncService, ElasticClient],
    exports: [ElasticClient],
})
export class ElasticSearchModule {}
