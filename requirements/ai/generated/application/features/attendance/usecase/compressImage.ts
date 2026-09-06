export async function compressImage(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const maxLen = 1280;
      let width = img.width;
      let height = img.height;

      if (width > maxLen || height > maxLen) {
        if (width > height) {
          height = Math.round((height * maxLen) / width);
          width = maxLen;
        } else {
          width = Math.round((width * maxLen) / height);
          height = maxLen;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (resultBlob) => {
          if (resultBlob) {
            resolve(resultBlob);
          } else {
            reject(new Error('Canvas compression failed'));
          }
        },
        'image/jpeg',
        0.7
      );
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
  });
}