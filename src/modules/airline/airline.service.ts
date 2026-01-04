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
        const query = name.trim();
        if (!query) return [];

        const queryUpper = query.toUpperCase();
        const isCodeCandidate = query.length >= 2 && query.length <= 3;

        const result = await this.esClient.search({
            index: 'airlines',
            size: 15,
            body: {
                query: {
                    function_score: {
                        query: {
                            bool: {
                                must: [{ term: { active: 'Y' } }],
                                should: [
                                    ...(isCodeCandidate
                                        ? [
                                              {
                                                  term: {
                                                      iata_code: {
                                                          value: queryUpper,
                                                          boost: 10000,
                                                      },
                                                  },
                                              },
                                              {
                                                  term: {
                                                      icao_code: {
                                                          value: queryUpper,
                                                          boost: 5000,
                                                      },
                                                  },
                                              },
                                          ]
                                        : []),

                                    {
                                        term: {
                                            'name.keyword': {
                                                value: query,
                                                case_insensitive: true,
                                                boost: 8000,
                                            },
                                        },
                                    },

                                    {
                                        term: {
                                            'country.keyword': {
                                                value: query,
                                                case_insensitive: true,
                                                boost: 5000,
                                            },
                                        },
                                    },

                                    {
                                        multi_match: {
                                            query: query,
                                            type: 'phrase_prefix',
                                            fields: [
                                                'name^3',
                                                'callsign^2',
                                                'country',
                                            ],
                                            boost: 1000,
                                        },
                                    },

                                    {
                                        multi_match: {
                                            query: query,
                                            fields: ['name', 'callsign'],
                                            fuzziness: 'AUTO',
                                            prefix_length: 2,
                                            boost: 10,
                                        },
                                    },
                                ],
                                minimum_should_match: 1,
                            },
                        },
                        functions: [
                            {
                                field_value_factor: {
                                    field: 'popularity',
                                    modifier: 'log1p',
                                    factor: 2,
                                    missing: 1,
                                },
                            },
                        ],
                        boost_mode: 'multiply',
                    },
                },
            },
        });

        return result.hits.hits.map((hit: any) => ({
            icao: hit._source.icao_code,
            iata: hit._source.iata_code,
            name: hit._source.name,
            country: hit._source.country,
            callsign: hit._source.callsign,
        }));
    }
}
