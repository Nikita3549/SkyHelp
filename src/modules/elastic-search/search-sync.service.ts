import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Client } from '@elastic/elasticsearch';
import { ElasticSearchConfigsPath } from '../../common/constants/paths/ElasticSearchConfigsPath';
import { ELASTIC_CLIENT_TOKEN } from './constants/elastic-client.token';
import { isProd } from '../../common/utils/isProd';
import { DbStaticService } from '../db-static/db-static.service';
import { awaitWithTimeout } from '@google-cloud/pubsub/build/src/util';

@Injectable()
export class SearchSyncService implements OnModuleInit {
    constructor(
        @Inject(ELASTIC_CLIENT_TOKEN) private readonly esClient: Client,
        private readonly dbStatic: DbStaticService,
    ) {}

    async onModuleInit() {
        const { count } = await this.esClient
            .count({ index: 'airports' })
            .catch(() => ({ count: 0 }));
        if (count === 0) {
            console.log('Elasticsearch index is empty. Starting sync...');
            this.runFullSync();
        }
    }

    async runFullSync() {
        const settings = await this.loadJson('es-settings.json');

        await this.prepareIndex(
            'airports',
            settings,
            await this.loadJson('es-airports.json'),
        );
        await this.syncTable(
            'airports',
            'SELECT id, name, city, country, iata_code, icao_code, language FROM airports',
        );
    }

    private async loadJson(fileName: string) {
        const filePath = path.join(ElasticSearchConfigsPath, fileName);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    }

    private async prepareIndex(index: string, settings: any, mapping: any) {
        const exists = await this.esClient.indices.exists({ index });

        if (exists) {
            await this.esClient.indices.delete({ index });
        }

        await this.esClient.indices.create({
            index,
            settings: settings.settings || settings,
            mappings: mapping.mappings || mapping,
        });
    }

    private async syncTable(index: string, sql: string) {
        if (!isProd()) return;

        const res = await this.dbStatic.pool.query(sql);
        const rows = res.rows;

        if (rows.length === 0) {
            return;
        }

        const operations = rows.flatMap((doc) => [
            {
                index: {
                    _index: index,
                    _id: `${doc.id}_${doc.iata_code || 'no-code'}_${doc.language}`,
                },
            },
            doc,
        ]);

        const bulkResponse = await this.esClient.bulk({
            refresh: true,
            operations,
        });

        if (bulkResponse.errors) {
            console.error(
                `${this.constructor.name}: Bulk Error at index [${index}]`,
            );
        }
    }
}
