import { Injectable, OnModuleInit } from '@nestjs/common';
import { IAirport } from './interfaces/airport.interface';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { IDbAirport } from './interfaces/db-airport.interface';

@Injectable()
export class AirportService implements OnModuleInit {
    private pool: Pool;
    constructor(private readonly configService: ConfigService) {}

    async onModuleInit() {
        this.pool = new Pool({
            user: this.configService.getOrThrow('DATABASE_STATIC_USER'),
            database: this.configService.getOrThrow('DATABASE_STATIC_DBNAME'),
            password: this.configService.getOrThrow('DATABASE_STATIC_PASSWORD'),
            host: this.configService.getOrThrow('DATABASE_STATIC_HOST'),
        });
    }

    public async getAirportsByName(name: string): Promise<IAirport[]> {
        const dbAirports = (
            await this.pool.query<IDbAirport>(
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

    public async getAirportByIcao(icao: string): Promise<IDbAirport | null> {
        const airport = await this.pool.query<IDbAirport>(
            `SELECT * FROM airports WHERE icao_code = $1`,
            [icao],
        );

        return airport.rows[0] || null;
    }
}
