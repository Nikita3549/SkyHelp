import {
    Controller,
    Get,
    NotFoundException,
    Param,
    UseGuards,
} from '@nestjs/common';
import { IPublicUserData } from './interfaces/publicUserData.interface';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { UserService } from './user.service';
import { TokenService } from '../token/token.service';
import { INCORRECT_USER_ID } from './constants';
import { IsModeratorGuard } from '../../guards/isModerator.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(
        private readonly userService: UserService,
        private readonly tokenService: TokenService,
    ) {}

    @Get()
    @UseGuards(IsModeratorGuard)
    async getUsers(): Promise<IPublicUserData[]> {
        return this.userService.getPublicUsers();
    }

    @Get(':id')
    @UseGuards(IsModeratorGuard)
    async getUser(@Param('id') id: string): Promise<IPublicUserData> {
        const user = await this.userService.getUserById(id);

        if (!user) {
            throw new NotFoundException(INCORRECT_USER_ID);
        }

        return user;
    }
}
