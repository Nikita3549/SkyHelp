import { createCanvas, Image, loadImage } from 'canvas';

export async function pngToJpeg(pngBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        loadImage(pngBuffer)
            .then((image: Image) => {
                const canvas = createCanvas(image.width, image.height);
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.drawImage(image, 0, 0);

                const jpegBuffer = canvas.toBuffer('image/jpeg', {
                    quality: 0.9,
                });

                resolve(jpegBuffer);
            })
            .catch(reject);
    });
}
