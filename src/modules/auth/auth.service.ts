import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { IRegisterDataWithCode } from './interfaces/registerDataWithCode.interface';
import {
    DEFAULT_GENERATED_PASSWORD_LENGTH,
    FORGOT_PASSWORD_CODE_TTL,
    REDIS_REGISTER_DATA_KEY_POSTFIX,
    REDIS_RESET_PASSWORD_CODE_KEY_POSTFIX,
    REGISTER_DATA_TTL,
} from './constants';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { UserService } from '../user/user.service';
import { NotificationService } from '../notification/notification.service';
import { TokenService } from '../token/token.service';
import { Languages } from '../language/enums/languages.enums';
import { hashPassword } from './utils/hashPassword';

@Injectable()
export class AuthService {
    constructor(
        private readonly redis: RedisService,
        private readonly userService: UserService,
        private readonly notificationService: NotificationService,
        private readonly tokenService: TokenService,
    ) {}

    async deleteRegisterDataFromRedis(email: string) {
        await this.redis.del(`${email}:${REDIS_REGISTER_DATA_KEY_POSTFIX}`);
    }

    public async getRegisterDataFromRedis(
        email: string,
    ): Promise<IRegisterDataWithCode | null> {
        const registerDataWithCode = await this.redis.get(
            `${email}:${REDIS_REGISTER_DATA_KEY_POSTFIX}`,
        );

        if (!registerDataWithCode) {
            return null;
        }

        const registerDataWithCodeParsed = JSON.parse(registerDataWithCode);

        this.assertRegisterDataWithCode(registerDataWithCodeParsed);

        return registerDataWithCodeParsed;
    }

    public async saveRegisterDataInRedis(
        registerDataWithCode: IRegisterDataWithCode,
    ) {
        await this.redis.setex(
            `${registerDataWithCode.registerData.email}:${REDIS_REGISTER_DATA_KEY_POSTFIX}`,
            REGISTER_DATA_TTL,
            JSON.stringify(registerDataWithCode),
        );
    }

    async saveForgotPasswordCode(email: string, code: number) {
        await this.redis.setex(
            `${email}:${REDIS_RESET_PASSWORD_CODE_KEY_POSTFIX}`,
            FORGOT_PASSWORD_CODE_TTL,
            code,
        );
    }

    async getForgotPasswordCode(email: string): Promise<string | null> {
        return this.redis.get(
            `${email}:${REDIS_RESET_PASSWORD_CODE_KEY_POSTFIX}`,
        );
    }

    async deleteForgotPasswordCode(email: string) {
        await this.redis.del(
            `${email}:${REDIS_RESET_PASSWORD_CODE_KEY_POSTFIX}`,
        );
    }

    public generateCode(): number {
        return Math.floor(100000 + Math.random() * 900000);
    }

    public async comparePasswords(
        password: string,
        hashedPassword: string,
    ): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
    }

    private assertRegisterDataWithCode(
        data: unknown,
    ): asserts data is IRegisterDataWithCode {
        if (
            typeof data == 'object' &&
            data != null &&
            'code' in data &&
            'registerData' in data
        ) {
            return;
        }
        new Error("Redis error. Data from redis doesn't match save pattern");
    }

    async generateNewUser(userData: {
        email: string;
        name: string;
        secondName: string;
        language: Languages;
    }) {
        const { email, name, secondName, language } = userData;
        let userToken: string | null = null;
        let userId: string | null = null;

        const user = await this.userService.getUserByEmail(email);

        if (!user) {
            const password = this.generatePassword();

            const hashedPassword = await hashPassword(password);

            const newUser = await this.userService.saveUser({
                email,
                hashedPassword,
                name,
                secondName,
            });
            userId = newUser.id;

            userToken = this.tokenService.generateJWT({
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                secondName: newUser.secondName,
                role: UserRole.CLIENT,
                isActive: true,
            });

            this.notificationService.sendNewGeneratedAccount(
                email,
                {
                    email: email,
                    password,
                },
                language,
            );
        }
        return {
            userToken,
            userId,
        };
    }

    private generatePassword(length = DEFAULT_GENERATED_PASSWORD_LENGTH) {
        return crypto
            .randomBytes(length)
            .toString('base64')
            .slice(0, length)
            .replace(/[+/]/g, 'A');
    }
}
