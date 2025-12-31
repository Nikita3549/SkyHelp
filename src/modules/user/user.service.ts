import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OauthProvider, Prisma, User, UserRole } from '@prisma/client';
import { ISaveUserData } from './interfaces/saveUserData.interface';
import { IPublicUserData } from './interfaces/publicUserData.interface';
import { IUserWithOauthAccounts } from './interfaces/user-with-oauth-account.interface';

@Injectable()
export class UserService {
    constructor(private readonly prisma: PrismaService) {}

    async getUserByProviderId(
        providerId: string,
        provider: OauthProvider,
    ): Promise<IUserWithOauthAccounts | null> {
        return new Promise(async (resolve, _reject) => {
            await this.prisma.$transaction(
                async (tx: Prisma.TransactionClient) => {
                    const oauthAccount = await tx.oauthAccount.findUnique({
                        where: {
                            provider_providerId: {
                                providerId,
                                provider,
                            },
                        },
                    });

                    if (!oauthAccount) {
                        resolve(null);
                        return;
                    }

                    const user = await tx.user.findUniqueOrThrow({
                        where: {
                            id: oauthAccount.userId,
                        },
                        include: {
                            oauthAccounts: true,
                        },
                    });

                    resolve(user);
                },
            );
        });
    }

    async createOauthAccount(data: {
        providerId: string;
        provider: OauthProvider;
        userId: string;
    }) {
        return this.prisma.oauthAccount.create({
            data,
        });
    }

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

    saveUserWithOauthAccount(
        registerData: {
            email: string;
            name?: string;
            secondName?: string;
            role?: UserRole;
        },
        oauthAccountData: {
            providerId: string;
            provider: OauthProvider;
        },
    ): Promise<IPublicUserData> {
        return new Promise((resolve, _reject) => {
            this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const user = await tx.user.create({
                    data: {
                        name: registerData.name || registerData.email,
                        secondName: registerData.secondName || '-',
                        role: registerData.role,
                        email: registerData.email,
                    },
                    omit: {
                        hashedPassword: true,
                        updatedAt: true,
                    },
                });

                tx.oauthAccount.create({
                    data: {
                        providerId: oauthAccountData.providerId,
                        provider: oauthAccountData.provider,
                        userId: user.id,
                    },
                });

                resolve(user);
            });
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
