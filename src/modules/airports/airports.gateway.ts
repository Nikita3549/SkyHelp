import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TokenService } from '../token/token.service';
import {
    InternalServerErrorException,
    UseFilters,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ValidationFilter } from './filters/validation.filter';
import { INVALID_TOKEN } from './constants';
import { AuthSocket } from '../auth/interfaces/authSocket.interface';
import { LookupAirportDto } from './dto/lookup-airport.dto';
import { AirportsService } from './airports.service';
import { CacheService } from '../cache/cache.service';
import { JwtPayload } from 'jsonwebtoken';

@WebSocketGateway({ namespace: '/ws/airports' })
@UseFilters(new ValidationFilter())
@UsePipes(new ValidationPipe({ transform: true }))
export class AirportsGateway {
    constructor(
        private readonly airportsService: AirportsService,
        private readonly cacheService: CacheService,
    ) {}
    // async handleConnection(client: Socket) {
    //     try {
    //         const token: string | undefined =
    //             client.handshake.auth?.token ||
    //             client.handshake.headers.authorization?.split(' ')[1];
    //
    //         if (!token) {
    //             throw new Error();
    //         }
    //
    //         const { id: userId } =
    //             this.tokenService.verifyJWT<JwtPayload>(token);
    //
    //         (client as AuthSocket).data.userId = userId;
    //     } catch (e: unknown) {
    //         client.emit('exception', INVALID_TOKEN);
    //         client.disconnect();
    //     }
    // }

    @SubscribeMessage('lookupAirportCode')
    async handleLookupAirportCode(_client: Socket, dto: LookupAirportDto) {
        const { name: airportName } = dto;
        if (airportName.length <= 1) {
            return [];
        }
        const formatedAirportName = airportName.toLowerCase().trim();
        const cache = await this.cacheService.getCache(
            `airports-${formatedAirportName}`,
        );

        if (cache) {
            return JSON.parse(cache);
        }

        const airports = await this.airportsService
            .getAirportsByName(formatedAirportName)
            .catch((e: unknown) => {
                console.error(e);
                throw new InternalServerErrorException();
            });

        this.cacheService.setCache(
            `airports-${formatedAirportName}`,
            JSON.stringify(airports),
        );

        return airports;
    }
}
