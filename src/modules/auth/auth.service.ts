import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { IRegisterDataWithCode } from './interfaces/registerDataWithCode.interface';
import {
    REGISTER_DATA_TTL,
    FORGOT_PASSWORD_CODE_TTL,
    REDIS_REGISTER_DATA_KEY_POSTFIX,
    REDIS_RESET_PASSWORD_CODE_KEY_POSTFIX,
    DEFAULT_GENERATED_PASSWORD_LENGTH,
} from './constants';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(private readonly redis: RedisService) {}

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

    public async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, 10);
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

    generatePassword(length = DEFAULT_GENERATED_PASSWORD_LENGTH) {
        return crypto
            .randomBytes(length)
            .toString('base64')
            .slice(0, length)
            .replace(/[+/]/g, 'A');
    }
}
