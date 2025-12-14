import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { IPublicUserData } from './interfaces/publicUserData.interface';
import { JwtAuthGuard } from '../../common/guards/jwtAuth.guard';
import { UserService } from './user.service';
import { INCORRECT_USER_ID, USER_NOT_FOUND } from './constants';
import { GetUsersDto } from './dto/get-users.dto';
import { UserRole } from '@prisma/client';
import { RoleGuard } from '../../common/guards/role.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from '../auth/utils/hashPassword';
import { UpdateRoleDto } from '../auth/dto/update-role.dto';
import { UserByIdPipe } from './pipes/user-by-id.pipe';
import { UpdateStatusDto } from '../auth/dto/update-status.dto';

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

    @Patch(':userId/role')
    @UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
    async updateRole(
        @Param('userId', UserByIdPipe) user: IPublicUserData,
        @Body() dto: UpdateRoleDto,
    ) {
        const { role } = dto;

        return await this.userService.updateRole(role, user.id);
    }

    @Patch(`:userId/status`)
    @UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
    async updateStatus(
        @Param('userId', UserByIdPipe) user: IPublicUserData,
        @Body() dto: UpdateStatusDto,
    ) {
        const { isActive } = dto;

        await this.userService.updateStatus(isActive, user.id);
    }
}
