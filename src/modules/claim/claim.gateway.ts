import {
    OnGatewayConnection,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import {
    BadRequestException,
    UseFilters,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ValidationFilter } from '../../filters/validation.filter';
import { TokenService } from '../token/token.service';
import { Server, Socket } from 'socket.io';
import { INVALID_TOKEN } from '../chat/constants';
import { IJwtPayload } from '../token/interfaces/jwtPayload';
import { UserRole } from '@prisma/client';
import { ClaimService } from './claim.service';
import { AuthSocket } from '../auth/interfaces/authSocket.interface';
import { SearchClaimsDto } from './dto/search-claims.dto';

@WebSocketGateway({
    namespace: '/ws/claims',
    cors: {
        origin: '*',
    },
})
@UseFilters(new ValidationFilter())
@UsePipes(new ValidationPipe({ transform: true }))
export class ClaimGateway implements OnGatewayConnection {
    constructor(
        private readonly tokenService: TokenService,
        private readonly claimService: ClaimService,
    ) {}
    @WebSocketServer() server: Server;

    async handleConnection(client: Socket) {
        try {
            const token: string | undefined =
                client.handshake.auth?.token ||
                client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                throw new Error();
            }

            const payload = this.tokenService.verifyJWT<IJwtPayload>(token);

            client.data = payload;

            if (
                payload.role != UserRole.ADMIN &&
                payload.role != UserRole.MODERATOR
            ) {
            }
        } catch (e: unknown) {
            client.emit('exception', INVALID_TOKEN);
            client.disconnect();
        }
    }

    @SubscribeMessage('claims')
    handleMessage(client: AuthSocket, dto: SearchClaimsDto) {
        const { claimId, firstName, lastName, date } = dto;

        let dateStart: Date | undefined;
        let dateEnd: Date | undefined;

        if (date) {
            const [day, month, year] = date.split('.');
            if (!day || !month || !year)
                throw new BadRequestException('Invalid date format');

            const parsedDate = new Date(`${year}-${month}-${day}T00:00:00Z`);
            if (isNaN(parsedDate.getTime()))
                throw new BadRequestException('Invalid date');

            dateStart = new Date(parsedDate);
            dateEnd = new Date(parsedDate);
            dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
        }

        return this.claimService.searchClaims({
            ...dto,
            dateEnd,
            dateStart,
        });
    }
}
