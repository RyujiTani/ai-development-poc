import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { compressImage } from '@/features/attendance/usecase/compressImage';

describe('compressImage Utility Tests', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as any);

    HTMLCanvasElement.prototype.toBlob = function (callback) {
      if (callback) {
        callback(new Blob(['compressed-image'], { type: 'image/jpeg' }));
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('TST-SCR-005-007: 画像圧縮ユーティリティが画像をアスペクト比を維持して圧縮・リサイズすること', async () => {
    // Canvas と Image のモック
    const originalCreateObjectURL = global.URL.createObjectURL;
    const originalRevokeObjectURL = global.URL.revokeObjectURL;

    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:dummy');
    global.URL.revokeObjectURL = vi.fn();

    // 擬似的な Image オブジェクトモック
    const dummyImage = {
      width: 3000,
      height: 2000,
      src: '',
      onload: () => {},
    };

    global.Image = vi.fn().mockImplementation(() => {
      const img = dummyImage as any;
      setTimeout(() => {
        img.onload();
      }, 0);
      return img;
    }) as any;

    const dummyBlob = new Blob(['original_image_bytes'], { type: 'image/jpeg' });
    const compressed = await compressImage(dummyBlob);

    expect(compressed).toBeInstanceOf(Blob);
    expect(compressed.type).toBe('image/jpeg');

    // 復元
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
  });
});