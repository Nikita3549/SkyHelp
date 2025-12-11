import { spawn } from 'child_process';
import path from 'path';

export async function convertDocToPdf(inputPath: string, outputPath: string) {
    return new Promise<void>((resolve, reject) => {
        const libre = spawn('soffice', [
            '--headless',
            '--convert-to',
            'pdf',
            '--outdir',
            path.dirname(outputPath),
            inputPath,
        ]);

        libre.on('exit', (code: number) => {
            if (code === 0) resolve();
            else
                reject(
                    new Error(
                        `LibreOffice conversion failed with code ${code}`,
                    ),
                );
        });
    });
}
