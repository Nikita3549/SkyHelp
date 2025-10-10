import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UploadDocumentsDto } from '../../modules/claim/document/dto/upload-documents.dto';

@Injectable()
export class ValidateDocumentsBodyInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();

        let documentTypes;
        try {
            documentTypes = JSON.parse(request.body.documentTypes);
        } catch {
            throw new BadRequestException(
                'Invalid JSON in documentTypes field',
            );
        }

        const dto = plainToInstance(UploadDocumentsDto, { documentTypes });
        const errors = validateSync(dto);

        if (errors.length > 0) {
            throw new BadRequestException(errors);
        }

        request.body = dto;

        return next.handle();
    }
}
