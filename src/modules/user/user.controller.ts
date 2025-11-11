import {
    Controller,
    Get,
    NotFoundException,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { IPublicUserData } from './interfaces/publicUserData.interface';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { UserService } from './user.service';
import { INCORRECT_USER_ID } from './constants';
import { GetUsersDto } from './dto/get-users.dto';
import { UserRole } from '@prisma/client';
import { RoleGuard } from '../../guards/role.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @UseGuards(new RoleGuard([UserRole.ADMIN]))
    async getUsers(@Query() query: GetUsersDto): Promise<IPublicUserData[]> {
        const { role } = query;

        return this.userService.getPublicUsers(role);
    }

    @Get(':id')
    @UseGuards(new RoleGuard([UserRole.ADMIN]))
    async getUser(@Param('id') id: string): Promise<IPublicUserData> {
        const user = await this.userService.getUserById(id);

        if (!user) {
            throw new NotFoundException(INCORRECT_USER_ID);
        }

        return user;
    }
}
