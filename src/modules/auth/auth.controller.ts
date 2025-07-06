import {
    BadRequestException,
    UnauthorizedException,
    Body,
    ConflictException,
    Controller,
    HttpCode,
    HttpStatus,
    Post,
    Put,
    UseGuards,
    NotFoundException,
    Get,
    Req,
    Query,
} from '@nestjs/common';
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
    INVALID_USER_ID,
    PASSWORD_WAS_CHANGED_SUCCESS,
    SEND_FORGOT_PASSWORD_CODE_SUCCESS,
    WRONG_CODE_ERROR,
    WRONG_EMAIL,
    WRONG_EMAIL_OR_PASSWORD,
} from './constants';
import { NotificationsService } from '../notifications/notifications.service';
import { VerifyRegisterDto } from './dto/verify-register.dto';
import { TokenService } from '../token/token.service';
import { IPublicUserDataWithJwt } from './interfaces/publicUserDataWithJwt.interface';
import { ResendCodeDto } from './dto/resend-code.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetPasswordDto } from './dto/verify-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { UserRole } from '@prisma/client';
import { IsModeratorGuard } from '../../guards/isModerator.guard';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AuthRequest } from '../../interfaces/AuthRequest.interface';
import { IClaimJwt } from '../claims/interfaces/claim-jwt.interface';
import { ClaimsService } from '../claims/claims.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly notificationService: NotificationsService,
        private readonly tokenService: TokenService,
        private readonly claimService: ClaimsService,
    ) {}

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

        const hashedPassword = await this.authService.hashPassword(password);

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

            await this.notificationService.sendRegisterCode(email, code);
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

        const jwt = this.tokenService.generateJWT({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            secondName: userData.secondName,
            role: UserRole.CLIENT,
            isActive: true,
        });

        await this.connectWithClaim(userData.id, claimToken);

        return {
            userData,
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

        await this.notificationService.sendRegisterCode(
            email,
            registerDataWithCode.code,
        );

        return CODE_SUCCESSFUL_RESEND;
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(
        @Body() dto: LoginDto,
        @Query('claim') claimToken?: string,
    ): Promise<IPublicUserDataWithJwt> {
        const { email, password } = dto;

        const expiredUser = await this.userService.getUserByEmail(email);

        if (!expiredUser) {
            throw new UnauthorizedException(WRONG_EMAIL_OR_PASSWORD);
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

        const publicUserData = {
            name: user.name,
            secondName: user.secondName,
            role: user.role,
            email: user.email,
            id: user.id,
            isActive: user.isActive,
            lastSign: user.lastSign,
            createdAt: user.lastSign,
        };

        const jwt = this.tokenService.generateJWT(publicUserData);

        await this.connectWithClaim(user.id, claimToken);

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

        await this.notificationService.sendForgotPasswordCode(email, code);

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

        const newHashedPassword =
            await this.authService.hashPassword(newPassword);

        await this.userService.changePassword(email, newHashedPassword);

        await this.authService.deleteForgotPasswordCode(email);

        await this.notificationService.sendPasswordChanged(email);

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

    @Put('/role')
    @UseGuards(JwtAuthGuard, IsModeratorGuard)
    async updateRole(@Body() dto: UpdateRoleDto) {
        const { userUuid, newRole } = dto;

        if (!(await this.userService.getUserById(userUuid))) {
            throw new NotFoundException(INVALID_USER_ID);
        }

        await this.userService.updateRole(newRole, userUuid);
    }

    @Put('/status')
    @UseGuards(JwtAuthGuard, IsModeratorGuard)
    async updateStatus(@Body() dto: UpdateStatusDto) {
        const { userUuid, isActive } = dto;

        if (!(await this.userService.getUserById(userUuid))) {
            throw new NotFoundException(INVALID_USER_ID);
        }

        await this.userService.updateStatus(isActive, userUuid);
    }

    @Get('/me')
    @UseGuards(JwtAuthGuard)
    async decodeToken(@Req() req: AuthRequest) {
        return req.user;
    }

    private async connectWithClaim(userId: string, claimToken?: string) {
        if (claimToken) {
            try {
                const payload =
                    this.tokenService.verifyJWT<IClaimJwt>(claimToken);

                await this.claimService.connectWithUser(
                    payload.claimId,
                    userId,
                );
            } catch (e: unknown) {}
        }
    }
}
