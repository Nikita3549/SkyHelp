import { Injectable } from '@nestjs/common';
import { IAirports } from './interfaces/airport.interface';
import axios, { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AirportsService {
    constructor(private readonly configService: ConfigService) {}

    public async getAirportsByName(name: string): Promise<IAirports> {
        const response: AxiosResponse<IAirports> = await axios.get(
            `${this.configService.getOrThrow('AVIATION_STACK_BASE_URL')}/airports?access_key=${this.configService.getOrThrow('AVIATION_STACK_API_KEY')}&search=${name}`,
        );

        return {
            data: this.sortAirports(response.data.data, name),
        };
    }
    private sortAirports(list: IAirports['data'], query: string) {
        const q = query.trim().toLowerCase();

        return (
            list
                // attach scoring + original index for stable sorting
                .map((a, idx) => ({
                    airport: a,
                    score: a.airport_name.toLowerCase().indexOf(q), // -1 if no hit
                    idx,
                }))
                .sort((a, b) => {
                    const aHas = a.score !== -1;
                    const bHas = b.score !== -1;

                    if (aHas && bHas) {
                        // both matched: closer to start wins, otherwise keep original order
                        return a.score === b.score
                            ? a.idx - b.idx
                            : a.score - b.score;
                    }
                    if (aHas) return -1; // only a matched — a first
                    if (bHas) return 1; // only b matched — b first
                    return a.idx - b.idx; // no hits: preserve initial order
                })
                .map(({ airport }) => airport)
        );
    }
}
