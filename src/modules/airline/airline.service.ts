import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAirline } from './interfaces/airline.interface';
import { Pool } from 'pg';
import { IDbAirline } from './interfaces/db-airline.interface';
import * as process from 'process';
import { Client } from '@elastic/elasticsearch';
import { ELASTIC_CLIENT_TOKEN } from '../elastic-search/constants/elastic-client.token';

@Injectable()
export class AirlineService implements OnModuleInit {
    private pool: Pool;

    constructor(
        private readonly configService: ConfigService,
        @Inject(ELASTIC_CLIENT_TOKEN) private readonly esClient: Client,
    ) {}

    async onModuleInit() {
        this.pool = new Pool({
            user: this.configService.getOrThrow('DATABASE_STATIC_USER'),
            database: this.configService.getOrThrow('DATABASE_STATIC_DBNAME'),
            password: this.configService.getOrThrow('DATABASE_STATIC_PASSWORD'),
            host: this.configService.getOrThrow('DATABASE_STATIC_HOST'),
            port:
                process.env.NODE_ENV == 'LOCAL_DEV'
                    ? this.configService.getOrThrow('DATABASE_STATIC_PORT')
                    : 5432,
        });
    }

    async getAirlineByIcao(icao: string): Promise<IAirline | null> {
        const result = await this.pool.query<IDbAirline>(
            `SELECT
            id,
            name,
            alias,
            iata_code,
            icao_code,
            callsign,
            country,
            active
         FROM airlines
         WHERE active = true
           AND icao_code = $1
         LIMIT 1;`,
            [icao.toUpperCase()],
        );

        const row = result.rows[0];
        if (!row || !row?.icao_code || !row?.iata_code) {
            return null;
        }

        return {
            icao: row.icao_code,
            iata: row.iata_code,
            name: row.name,
        };
    }

    async getAirlineByIata(iata: string): Promise<IAirline | null> {
        const result = await this.pool.query<IDbAirline>(
            `SELECT
            id,
            name,
            alias,
            iata_code,
            icao_code,
            callsign,
            country,
            active
         FROM airlines
         WHERE active = true
           AND iata_code = $1
         LIMIT 1;`,
            [iata.toUpperCase()],
        );

        const row = result.rows[0];
        if (!row || !row?.icao_code || !row?.iata_code) {
            return null;
        }

        return {
            icao: row.icao_code,
            iata: row.iata_code,
            name: row.name,
        };
    }

    public async getAirlinesByName(name: string): Promise<IAirline[]> {
        const dbAirlines = await this.pool.query<IDbAirline>(
            'SELECT\n' +
                '  id,\n' +
                '  name,\n' +
                '  alias,\n' +
                '  iata_code,\n' +
                '  icao_code,\n' +
                '  callsign,\n' +
                '  country,\n' +
                '  active,\n' +
                '  CASE\n' +
                '    WHEN iata_code ILIKE $1 THEN 1\n' +
                '    WHEN icao_code ILIKE $1 THEN 2\n' +
                '    WHEN name ILIKE $1 THEN 3\n' +
                "    WHEN iata_code ILIKE '%' || $1 || '%' THEN 4\n" +
                "    WHEN icao_code ILIKE '%' || $1 || '%' THEN 5\n" +
                "    WHEN name ILIKE '%' || $1 || '%' THEN 6\n" +
                '    ELSE 7\n' +
                '  END AS relevance\n' +
                'FROM airlines\n' +
                'WHERE active = true\n' +
                '  AND (\n' +
                "    iata_code ILIKE '%' || $1 || '%'\n" +
                "    OR icao_code ILIKE '%' || $1 || '%'\n" +
                "    OR name ILIKE '%' || $1 || '%'\n" +
                '  )\n' +
                'ORDER BY relevance, name\n' +
                'LIMIT 10;\n',
            [name],
        );

        return dbAirlines.rows.flatMap((a) => {
            if (!a.icao_code || !a.name || !a.iata_code) {
                return [];
            }

            return [
                {
                    icao: a.icao_code,
                    iata: a.iata_code,
                    name: a.name,
                },
            ];
        });
    }
}
