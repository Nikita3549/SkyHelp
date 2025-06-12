import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { IAirline } from './interfaces/airline.interface';

@Injectable()
export class AirlinesService {
    constructor(private readonly configService: ConfigService) {}

    public async getAirlinesByName(name: string): Promise<IAirline[]> {
        const response: AxiosResponse<IAirline[]> = await axios.get(
            `${this.configService.getOrThrow('NINJAS_API_HOST')}/v1/airlines/`,
            {
                params: { name },
                headers: {
                    'X-Api-Key':
                        this.configService.getOrThrow('NINJAS_API_KEY'),
                },
            },
        );

        return response.data.map((airline: IAirline) => ({
            icao: airline.icao,
            name: airline.name,
        }));
    }
}
