import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { IDbAirport } from './interfaces/db-airport.interface';
import * as process from 'process';
import { Client } from '@elastic/elasticsearch';
import { ELASTIC_CLIENT_TOKEN } from '../elastic-search/constants/elastic-client.token';
import { IAirport } from './interfaces/airport.interface';

@Injectable()
export class AirportService implements OnModuleInit {
    private pool: Pool;

    constructor(
        private readonly configService: ConfigService,
        @Inject(ELASTIC_CLIENT_TOKEN) private readonly esClient: Client,
    ) {}

    onModuleInit() {
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

    public async getAirportsByName(name: string): Promise<IAirport[]> {
        let query = name.trim();
        if (!query) return [];

        const queryUpper = query.toUpperCase();

        const isLikelyCode = /^[A-Za-z]{3,4}$/.test(query);

        const result = await this.esClient.search({
            index: 'airports',
            body: {
                query: {
                    function_score: {
                        query: {
                            bool: {
                                should: [
                                    ...(isLikelyCode
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
                                                          boost: 10000,
                                                      },
                                                  },
                                              },
                                          ]
                                        : []),

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
                                        term: {
                                            'city.keyword': {
                                                value: query,
                                                case_insensitive: true,
                                                boost: 4000,
                                            },
                                        },
                                    },

                                    {
                                        multi_match: {
                                            query: query,
                                            type: 'cross_fields',
                                            fields: [
                                                'city^3',
                                                'name^2',
                                                'country',
                                            ],
                                            operator: 'and',
                                            boost: 2000,
                                        },
                                    },

                                    {
                                        multi_match: {
                                            query: query,
                                            type: 'phrase_prefix',
                                            fields: ['city', 'name', 'country'],
                                            boost: 1000,
                                        },
                                    },

                                    {
                                        multi_match: {
                                            query: query,
                                            fields: ['name', 'city'],
                                            fuzziness: 'AUTO',
                                            prefix_length: 1,
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
                                    modifier: 'log2p',
                                    factor: 1.5,
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
            city: hit._source.city,
            name: hit._source.name,
            country: hit._source.country,
            callsign: hit._source.callsign,
        }));
    }

    public async getAirportByIcao(icao: string): Promise<IDbAirport | null> {
        const airport = await this.pool.query<IDbAirport>(
            `SELECT * FROM airports WHERE icao_code = $1`,
            [icao],
        );

        return airport.rows[0] || null;
    }

    public async getAirportByIata(iata: string): Promise<IDbAirport | null> {
        const airport = await this.pool.query<IDbAirport>(
            `SELECT * FROM airports WHERE iata_code = $1`,
            [iata],
        );

        return airport.rows[0] || null;
    }
}
