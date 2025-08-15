import { appendFile } from 'fs/promises';
import { join } from 'path';

export class GmailOfficeAccountLogger {
    private filePath = join(__dirname, '../../../../../logs/gmail-office.log');
    private prefix = '[Gmail Office]';

    private async write(type: string, args: unknown[]) {
        const time = new Date().toISOString();
        const msg = args
            .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
            .join(' ');
        await appendFile(
            this.filePath,
            `${time} ${type} ${this.prefix} ${msg}\n`,
        );
    }

    async log(...args: unknown[]) {
        await this.write('INFO', args);
    }

    async warn(...args: unknown[]) {
        await this.write('WARN', args);
    }

    async error(...args: unknown[]) {
        await this.write('ERROR', args);
    }
}
