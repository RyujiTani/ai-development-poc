export async function compressImage(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    const maxLen = 1280;
    let width = canvas.width;
    let height = canvas.height;

    if (width > maxLen || height > maxLen) {
      if (width > height) {
        height = Math.round((height * maxLen) / width);
        width = maxLen;
      } else {
        width = Math.round((width * maxLen) / height);
        height = maxLen;
      }
    }

    if (typeof document === "undefined") {
      resolve(new Blob());
      return;
    }

    const resizeCanvas = document.createElement("canvas");
    resizeCanvas.width = width;
    resizeCanvas.height = height;
    const ctx = resizeCanvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(canvas, 0, 0, width, height);
      resizeCanvas.toBlob(
        (blob) => {
          resolve(blob || new Blob());
        },
        "image/jpeg",
        0.7
      );
    } else {
      canvas.toBlob(
        (blob) => {
          resolve(blob || new Blob());
        },
        "image/jpeg",
        0.7
      );
    }
  });
}