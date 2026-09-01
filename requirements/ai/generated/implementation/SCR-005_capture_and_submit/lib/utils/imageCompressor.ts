/**
 * Compresses active frame from standard HTMLVideoElement into optimized JPEG blob
 * with maximum dimension limit of 1280px and quality factor of 0.7
 */
export function compressImage(
  videoElement: HTMLVideoElement,
  maxWidthOrHeight: number = 1280,
  quality: number = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas rendering context 2D is unavailable');
      }

      const originalWidth = videoElement.videoWidth || 640;
      const originalHeight = videoElement.videoHeight || 480;

      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

      if (originalWidth > maxWidthOrHeight || originalHeight > maxWidthOrHeight) {
        if (originalWidth > originalHeight) {
          targetWidth = maxWidthOrHeight;
          targetHeight = Math.round((originalHeight * maxWidthOrHeight) / originalWidth);
        } else {
          targetHeight = maxWidthOrHeight;
          targetWidth = Math.round((originalWidth * maxWidthOrHeight) / originalHeight);
        } 
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas compression output returned empty blob'));
          }
        },
        'image/jpeg',
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}
"
    },
    {