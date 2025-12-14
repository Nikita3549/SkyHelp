import {
    ArgumentMetadata,
    Injectable,
    NotFoundException,
    PipeTransform,
} from '@nestjs/common';
import { UserService } from '../user.service';
import { IPublicUserData } from '../interfaces/publicUserData.interface';
import { USER_NOT_FOUND } from '../constants';

@Injectable()
export class UserByIdPipe implements PipeTransform {
    constructor(private readonly userService: UserService) {}

    async transform(
        userId: string,
        _metadata: ArgumentMetadata,
    ): Promise<IPublicUserData> {
        const user = await this.userService.getUserById(userId);

        if (!user) {
            throw new NotFoundException(USER_NOT_FOUND);
        }

        return user;
    }
}
