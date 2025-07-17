import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { IAirline } from './interfaces/airline.interface';
import { Pool } from 'pg';
import { IDbAirline } from './interfaces/db-airline.interface';

@Injectable()
export class AirlineService implements OnModuleInit {
    private pool: Pool;
    constructor(private readonly configService: ConfigService) {}

    async onModuleInit() {
        this.pool = new Pool({
            user: this.configService.getOrThrow('DATABASE_STATIC_USER'),
            database: this.configService.getOrThrow('DATABASE_STATIC_DBNAME'),
            port: this.configService.getOrThrow('DATABASE_STATIC_PORT'),
            password: this.configService.getOrThrow('DATABASE_STATIC_PASSWORD'),
            host: this.configService.getOrThrow('DATABASE_STATIC_HOST'),
        });
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
            if (!a.icao_code || !a.name) {
                return [];
            }

            return [
                {
                    icao: a.icao_code,
                    name: a.name,
                },
            ];
        });
    }
}
