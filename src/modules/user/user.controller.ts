import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
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
import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from '../auth/utils/hashPassword';

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

    @Post('admin')
    @UseGuards(new RoleGuard([UserRole.ADMIN]))
    async createUser(@Body() dto: CreateUserDto) {
        const { password, secondName, name, email, role } = dto;

        const hashedPassword = await hashPassword(password);

        return await this.userService.saveUser({
            hashedPassword,
            secondName,
            name,
            email,
            role,
        });
    }
}
