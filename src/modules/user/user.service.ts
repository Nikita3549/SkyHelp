import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { ISaveUserData } from './interfaces/saveUserData.interface';
import { IPublicUserData } from './interfaces/publicUserData.interface';
import { IUpdateData } from './interfaces/update-data.interface';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    async getUserByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: {
                email,
            },
        });
    }

    async getUserById(id: string): Promise<IPublicUserData | null> {
        return this.prisma.user.findFirst({
            where: {
                id,
            },
            select: {
                id: true,
                email: true,
                name: true,
                secondName: true,
                role: true,
                lastSign: true,
                createdAt: true,
                isActive: true,
                partner: {
                    select: {
                        referralCode: true,
                    },
                },
            },
        });
    }

    async getPublicUsers(role?: UserRole): Promise<IPublicUserData[]> {
        return this.prisma.user.findMany({
            omit: {
                hashedPassword: true,
            },
            include: {
                partner: true,
            },
            where: {
                role,
            },
        });
    }

    async saveUser(registerData: ISaveUserData): Promise<IPublicUserData> {
        return this.prisma.user.create({
            data: {
                ...registerData,
            },
            omit: {
                hashedPassword: true,
                updatedAt: true,
            },
        });
    }

    async changePassword(email: string, newHashedPassword: string) {
        await this.prisma.user.update({
            data: {
                hashedPassword: newHashedPassword,
            },
            where: {
                email,
            },
        });
    }

    async updateRole(newRole: UserRole, userId: string): Promise<User> {
        return this.prisma.user.update({
            data: {
                role: newRole,
            },
            where: {
                id: userId,
            },
        });
    }

    async updateStatus(newStatus: boolean, userId: string): Promise<User> {
        return this.prisma.user.update({
            data: {
                isActive: newStatus,
            },
            where: {
                id: userId,
            },
        });
    }

    async updateLastSign(email: string): Promise<User> {
        return this.prisma.user.update({
            data: {
                lastSign: new Date(),
            },
            where: {
                email,
            },
        });
    }
}
