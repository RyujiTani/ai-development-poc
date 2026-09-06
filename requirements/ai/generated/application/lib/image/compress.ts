export async function compressImage(
  canvas: HTMLCanvasElement,
  maxSize = 1280,
  quality = 0.7
): Promise<Blob> {
  let width = canvas.width;
  let height = canvas.height;

  if (width > height) {
    if (width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  const resizeCanvas = document.createElement('canvas');
  resizeCanvas.width = width;
  resizeCanvas.height = height;
  const ctx = resizeCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  ctx.drawImage(canvas, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    resizeCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}