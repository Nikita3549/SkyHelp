import {
    registerDecorator,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';
import { ProgressVariants } from '../constants/progressVariants';

export function IsValidProgress(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isValidProgress',
            target: object.constructor,
            propertyName,
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

                    return Object.values(ProgressVariants).some(
                        (progress) =>
                            progress.title == obj.title &&
                            progress.description == obj.description,
                    );
                },
                defaultMessage() {
                    return 'Invalid progress: title and description must match one of predefined pairs';
                },
            },
        });
    };
}
