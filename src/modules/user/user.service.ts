import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, User } from '@prisma/client';
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
    async getUserById(uuid: string): Promise<IPublicUserData | null> {
        return this.prisma.user.findFirst({
            where: {
                uuid,
            },
            select: {
                uuid: true,
                email: true,
                name: true,
                secondName: true,
                role: true,
                lastSign: true,
                createdAt: true,
                isActive: true,
            },
        });
    }
    async getPublicUsers(): Promise<IPublicUserData[]> {
        return this.prisma.user.findMany({
            select: {
                uuid: true,
                email: true,
                name: true,
                secondName: true,
                role: true,
                isActive: true,
                lastSign: true,
                createdAt: true,
            },
        });
    }

    async updateUser(
        userUuid: string,
        updateData: IUpdateData,
    ): Promise<IPublicUserData> {
        return this.prisma.user.update({
            data: updateData,
            where: {
                uuid: userUuid,
            },
            select: {
                uuid: true,
                email: true,
                name: true,
                secondName: true,
                role: true,
                isActive: true,
                lastSign: true,
                createdAt: true,
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
    async updateRole(newRole: UserRole, userUuid: string): Promise<User> {
        return this.prisma.user.update({
            data: {
                role: newRole,
            },
            where: {
                uuid: userUuid,
            },
        });
    }
    async updateStatus(newStatus: boolean, userUuid: string): Promise<User> {
        return this.prisma.user.update({
            data: {
                isActive: newStatus,
            },
            where: {
                uuid: userUuid,
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
