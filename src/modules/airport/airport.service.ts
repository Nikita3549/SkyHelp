import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDbAirport } from './interfaces/db-airport.interface';
import { Client } from '@elastic/elasticsearch';
import { ELASTIC_CLIENT_TOKEN } from '../elastic-search/constants/elastic-client.token';
import { IAirport } from './interfaces/airport.interface';
import { isProd } from '../../common/utils/isProd';
import { DbStaticService } from '../db-static/db-static.service';

@Injectable()
export class AirportService {
    constructor(
        @Inject(ELASTIC_CLIENT_TOKEN) private readonly esClient: Client,
        private readonly dbStatic: DbStaticService,
    ) {}

    public async getAirportsByName(name: string): Promise<IAirport[]> {
        if (isProd()) {
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
                                                fields: [
                                                    'city',
                                                    'name',
                                                    'country',
                                                ],
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

                                    filter: isLikelyCode
                                        ? [{ term: { language: 'en' } }]
                                        : [],
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
        } else {
            const dbAirports = (
                await this.dbStatic.query<IDbAirport>(
                    'SELECT\n' +
                        '  id,\n' +
                        '  name,\n' +
                        '  city,\n' +
                        '  country,\n' +
                        '  iata_code,\n' +
                        '  icao_code,\n' +
                        '  latitude,\n' +
                        '  longitude,\n' +
                        '  altitude,\n' +
                        '  timezone_offset,\n' +
                        '  dst,\n' +
                        '  tz,\n' +
                        '  type,\n' +
                        '  source,\n' +
                        '  CASE\n' +
                        '    WHEN iata_code ILIKE $1 THEN 1 \n' +
                        '    WHEN icao_code ILIKE $1 THEN 2 \n' +
                        '    WHEN city ILIKE $1 THEN 3      \n' +
                        '    WHEN country ILIKE $1 THEN 4   \n' +
                        '    WHEN name ILIKE $1 THEN 5      \n' +
                        "    WHEN city ILIKE '%' || $1 || '%' THEN 6\n" +
                        "    WHEN country ILIKE '%' || $1 || '%' THEN 7\n" +
                        "    WHEN name ILIKE '%' || $1 || '%' THEN 8\n" +
                        '    ELSE 9\n' +
                        '  END AS relevance\n' +
                        'FROM airports\n' +
                        'WHERE\n' +
                        "  iata_code   ILIKE '%' || $1 || '%'\n" +
                        "  OR icao_code ILIKE '%' || $1 || '%'\n" +
                        "  OR city       ILIKE '%' || $1 || '%'\n" +
                        "  OR country    ILIKE '%' || $1 || '%'\n" +
                        "  OR name       ILIKE '%' || $1 || '%'\n" +
                        'ORDER BY relevance, name\n' +
                        'LIMIT 10;\n',
                    [name],
                )
            ).rows;

            return dbAirports.map((a) => ({
                icao: a.icao_code,
                iata: a.iata_code,
                country: a.country,
                city: a.city,
                name: a.name,
            }));
        }
    }

    public async getAirportByIcao(icao: string): Promise<IDbAirport | null> {
        const airport = await this.dbStatic.query<IDbAirport>(
            `SELECT * FROM airports WHERE icao_code = $1 AND language = 'en'`,
            [icao],
        );

        return airport.rows[0] || null;
    }

    public async getAirportByIata(iata: string): Promise<IDbAirport | null> {
        const airport = await this.dbStatic.query<IDbAirport>(
            `SELECT * FROM airports WHERE iata_code = $1 AND language = 'en'`,
            [iata],
        );

        return airport.rows[0] || null;
    }
}
