import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Client } from '@elastic/elasticsearch';
import * as process from 'process';
import { ElasticSearchConfigsPath } from '../../common/constants/paths/ElasticSearchConfigsPath';
import { ELASTIC_CLIENT_TOKEN } from './constants/elastic-client.token';
import { isProd } from '../../common/utils/isProd';

@Injectable()
export class SearchSyncService implements OnModuleInit {
    private pool: Pool;

    constructor(
        private readonly configService: ConfigService,
        @Inject(ELASTIC_CLIENT_TOKEN) private readonly esClient: Client,
    ) {}

    async onModuleInit() {
        if (!isProd()) return;

        this.pool = new Pool({
            user: this.configService.getOrThrow<string>('DATABASE_STATIC_USER'),
            database: this.configService.getOrThrow<string>(
                'DATABASE_STATIC_DBNAME',
            ),
            password: this.configService.getOrThrow<string>(
                'DATABASE_STATIC_PASSWORD',
            ),
            host: this.configService.getOrThrow<string>('DATABASE_STATIC_HOST'),
            port:
                process.env.NODE_ENV === 'LOCAL_DEV'
                    ? this.configService.getOrThrow<number>(
                          'DATABASE_STATIC_PORT',
                      )
                    : 5432,
        });

        await this.runFullSync();
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
            'SELECT id, name, city, country, iata_code, icao_code FROM airports',
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
        const res = await this.pool.query(sql);
        const rows = res.rows;

        if (rows.length === 0) {
            return;
        }

        const operations = rows.flatMap((doc) => [
            { index: { _index: index, _id: doc.id.toString() } },
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
