import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';
import { Progresses } from '../constants/progresses';

export function IsValidProgress(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isValidProgress',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(_value: unknown, args: ValidationArguments) {
                    const obj = args.object as {
                        title?: string;
                        description?: string;
                    };

                    if (!obj?.title || !obj?.description) {
                        return false;
                    }

                    return (
                        obj.title in Progresses &&
                        Progresses[obj.title as keyof typeof Progresses]
                            .description == obj.description
                    );
                },
                defaultMessage() {
                    return 'Invalid progress: title and description must match one of predefined pairs';
                },
            },
        });
    };
}
