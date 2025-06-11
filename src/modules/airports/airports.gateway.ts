import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { TokenService } from '../token/token.service';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
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
        private readonly tokenService: TokenService,
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
        const formatedAirportName = airportName.toLowerCase();
        const cache = await this.cacheService.getCache(formatedAirportName);

        if (cache) {
            return JSON.parse(cache);
        }

        const airports =
            await this.airportsService.getAirportsByName(formatedAirportName);

        this.cacheService.setCache(
            formatedAirportName,
            JSON.stringify(airports),
        );

        return airports;
    }
}
