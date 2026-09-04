/**
 * クライアント側で画像をアスペクト比を維持しつつ長辺最大 1280px にリサイズし、
 * JPEG品質 0.7 で圧縮して Blob として返却します。
 */
export async function compressImage(file: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Image compression is only available in the browser.'));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const maxLen = 1280;

      if (width > maxLen || height > maxLen) {
        if (width > height) {
          height = Math.round((height * maxLen) / width);
          width = maxLen;
        } else {
          width = Math.round((width * maxLen) / height);
          height = maxLen;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas compression failed.'));
          }
        },
        'image/jpeg',
        0.7
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression.'));
    };
  });
}