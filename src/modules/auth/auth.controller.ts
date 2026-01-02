import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    Post,
    Query,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import {
    ALREADY_REGISTERED_ERROR,
    CODE_IS_WRONG_OR_EXPIRED,
    CODE_SUCCESSFUL_RESEND,
    CONFIRM_REGISTRATION_SUCCESS,
    CORRECT_CODE,
    EXPIRE_CODE_OR_WRONG_EMAIL_ERROR,
    PASSWORD_WAS_CHANGED_SUCCESS,
    SEND_FORGOT_PASSWORD_CODE_SUCCESS,
    WRONG_CODE_ERROR,
    WRONG_EMAIL,
    WRONG_EMAIL_OR_PASSWORD,
} from './constants';
import { NotificationService } from '../notification/services/notification.service';
import { VerifyRegisterDto } from './dto/verify-register.dto';
import { TokenService } from '../token/token.service';
import { IPublicUserDataWithJwt } from './interfaces/publicUserDataWithJwt.interface';
import { ResendCodeDto } from './dto/resend-code.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetPasswordDto } from './dto/verify-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwtAuth.guard';
import { AuthRequest } from '../../common/interfaces/AuthRequest.interface';
import { IClaimJwt } from '../claim/interfaces/claim-jwt.interface';
import { ClaimService } from '../claim/claim.service';
import { hashPassword } from './utils/hashPassword';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ResetPasswordCodeLetter } from '../notification/letters/definitions/auth/reset-password-code.letter';
import { RegisterCodeLetter } from '../notification/letters/definitions/auth/register-code.letter';
import { ClaimPersistenceService } from '../claim-persistence/services/claim-persistence.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly notificationService: NotificationService,
        private readonly tokenService: TokenService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @Post('login/google')
    async googleLogin(
        @Body() dto: GoogleLoginDto,
    ): Promise<IPublicUserDataWithJwt> {
        return this.authService.authenticateGoogleLoginToken(dto.idToken);
    }

    @Post('register')
    @HttpCode(HttpStatus.OK)
    async register(@Body() dto: RegisterDto): Promise<string> {
        const { email, password, secondName, name } = dto;

        if (await this.userService.getUserByEmail(email)) {
            throw new ConflictException(ALREADY_REGISTERED_ERROR);
        }

        if (await this.authService.getRegisterDataFromRedis(email)) {
            return CONFIRM_REGISTRATION_SUCCESS;
        }

        const code = this.authService.generateCode();

        const hashedPassword = await hashPassword(password);

        try {
            await this.authService.saveRegisterDataInRedis({
                registerData: {
                    hashedPassword,
                    name: name,
                    secondName: secondName,
                    email: email,
                },
                code,
            });

            await this.notificationService.sendLetter(
                new RegisterCodeLetter({
                    to: email,
                    customerName: name,
                    registerCode: code,
                }),
            );
        } catch (e: unknown) {
            await this.authService.deleteRegisterDataFromRedis(email);

            throw e;
        }

        return CONFIRM_REGISTRATION_SUCCESS;
    }

    @Post('verify-register')
    async verifyRegister(
        @Body() dto: VerifyRegisterDto,
        @Query('claim') claimToken?: string,
    ): Promise<IPublicUserDataWithJwt> {
        const { email, code } = dto;

        const registerDataWithCode =
            await this.authService.getRegisterDataFromRedis(email);

        if (!registerDataWithCode) {
            throw new BadRequestException(EXPIRE_CODE_OR_WRONG_EMAIL_ERROR);
        }
        const { code: compareCode, registerData: registerData } =
            registerDataWithCode;

        if (code != compareCode) {
            throw new BadRequestException(WRONG_CODE_ERROR);
        }

        await this.authService.deleteRegisterDataFromRedis(email);

        const userData = await this.userService.saveUser(registerData);

        const { jwt, publicUserData } =
            this.authService.generateUserJwt(userData);

        await this.connectWithClaim(userData.id, claimToken);

        return {
            userData: publicUserData,
            jwt,
        };
    }

    @Post('resend-code')
    @HttpCode(HttpStatus.OK)
    async resendCode(@Body() dto: ResendCodeDto): Promise<string> {
        const { email } = dto;

        const registerDataWithCode =
            await this.authService.getRegisterDataFromRedis(email);

        if (!registerDataWithCode) {
            throw new BadRequestException(EXPIRE_CODE_OR_WRONG_EMAIL_ERROR);
        }

        await this.notificationService.sendLetter(
            new RegisterCodeLetter({
                registerCode: registerDataWithCode.code,
                customerName: registerDataWithCode.registerData.name,
                to: email,
            }),
        );

        return CODE_SUCCESSFUL_RESEND;
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto): Promise<IPublicUserDataWithJwt> {
        const { email, password } = dto;

        const expiredUser = await this.userService.getUserByEmail(email);

        if (!expiredUser) {
            throw new UnauthorizedException(WRONG_EMAIL_OR_PASSWORD);
        }

        if (!expiredUser.hashedPassword) {
            throw new ForbiddenException('SOCIAL_AUTH_ONLY');
        }

        if (
            !(await this.authService.comparePasswords(
                password,
                expiredUser.hashedPassword,
            ))
        ) {
            throw new UnauthorizedException(WRONG_EMAIL_OR_PASSWORD);
        }

        const user = await this.userService.updateLastSign(expiredUser.email);

        const { jwt, publicUserData } = this.authService.generateUserJwt(user);

        return {
            userData: publicUserData,
            jwt,
        };
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<string> {
        const { email } = dto;

        const user = await this.userService.getUserByEmail(email);

        if (!user) {
            throw new BadRequestException(WRONG_EMAIL);
        }

        const code = this.authService.generateCode();

        await this.notificationService.sendLetter(
            new ResetPasswordCodeLetter({
                to: email,
                resetCode: code,
                customerName: user.name,
            }),
        );

        await this.authService.saveForgotPasswordCode(email, code);

        return SEND_FORGOT_PASSWORD_CODE_SUCCESS;
    }

    @Post('verify-reset-password')
    @HttpCode(HttpStatus.OK)
    async verifyResetPassword(
        @Body() dto: VerifyResetPasswordDto,
    ): Promise<string> {
        const { email, code } = dto;

        await this.getAndCompareResetCode(email, code);

        return CORRECT_CODE;
    }

    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto): Promise<string> {
        const { email, code, newPassword } = dto;

        await this.getAndCompareResetCode(email, code);

        const newHashedPassword = await hashPassword(newPassword);

        await this.userService.changePassword(email, newHashedPassword);

        await this.authService.deleteForgotPasswordCode(email);

        return PASSWORD_WAS_CHANGED_SUCCESS;
    }

    private async getAndCompareResetCode(email: string, code: number) {
        const compareCode = await this.authService.getForgotPasswordCode(email);

        if (!compareCode) {
            throw new BadRequestException(WRONG_EMAIL);
        }

        if (code != +compareCode) {
            throw new BadRequestException(CODE_IS_WRONG_OR_EXPIRED);
        }
    }

    @Get('/me')
    @UseGuards(JwtAuthGuard)
    async decodeToken(
        @Req() req: AuthRequest,
        @Res({ passthrough: true }) res: Response,
    ) {
        const user = await this.userService.getUserById(req.user.id);

        if (!user) {
            throw new InternalServerErrorException();
        }

        const { jwt } = this.authService.generateUserJwt(user);

        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });

        res.cookie('accessToken', jwt, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
        });

        return { ...user, jwt };
    }

    @Post('logout')
    logout(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('accessToken', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });

        return { success: true };
    }

    private async connectWithClaim(userId: string, claimToken?: string) {
        if (claimToken) {
            try {
                const payload =
                    await this.tokenService.verifyJWT<IClaimJwt>(claimToken);

                await this.claimPersistenceService.update(
                    { userId: userId },
                    payload.claimId,
                );
            } catch (_e: unknown) {}
        }
    }
}
