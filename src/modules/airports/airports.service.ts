import { Injectable } from '@nestjs/common';
import { IAirport } from './interfaces/airport.interface';
import axios, { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AirportsService {
    constructor(private readonly configService: ConfigService) {}

    public async getAirportsByName(name: string): Promise<IAirport[]> {
        const response: AxiosResponse<IAirport[]> = await axios.get(
            `${this.configService.getOrThrow('NINJAS_API_HOST')}/v1/airports/`,
            {
                params: { name },
                headers: {
                    'X-Api-Key':
                        this.configService.getOrThrow('NINJAS_API_KEY'),
                },
            },
        );

        return response.data;
    }
}
