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
import { INCORRECT_USER_ID } from './constants';
import { IsAdminGuard } from '../../guards/isAdminGuard';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @UseGuards(IsAdminGuard)
    async getUsers(): Promise<IPublicUserData[]> {
        return this.userService.getPublicUsers();
    }

    @UseGuards(IsAdminGuard)
    @Get('partners')
    async getPartners(): Promise<IPublicUserData[]> {
        const partners = await this.userService.getPartners();

        return partners.map((p) => ({
            id: p.id,
            email: p.email,
            name: p.name,
            secondName: p.secondName,
            role: p.role,
            isActive: p.isActive,
            lastSign: p.lastSign,
            createdAt: p.createdAt,
        }));
    }

    @UseGuards(IsAdminGuard)
    @Get('agents')
    async getAgents(): Promise<IPublicUserData[]> {
        const agents = await this.userService.getAgents();

        return agents.map((p) => ({
            id: p.id,
            email: p.email,
            name: p.name,
            secondName: p.secondName,
            role: p.role,
            isActive: p.isActive,
            lastSign: p.lastSign,
            createdAt: p.createdAt,
        }));
    }

    @Get(':id')
    @UseGuards(IsAdminGuard)
    async getUser(@Param('id') id: string): Promise<IPublicUserData> {
        const user = await this.userService.getUserById(id);

        if (!user) {
            throw new NotFoundException(INCORRECT_USER_ID);
        }

        return user;
    }
}
