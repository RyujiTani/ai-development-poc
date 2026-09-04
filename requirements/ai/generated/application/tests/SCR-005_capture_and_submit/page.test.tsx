import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PunchCapturePage from '../../app/(contractor)/contractor/punch-photo/page';
import { ToastProvider } from '../../components/ui/toast';
import { useAttendanceStore } from '../../features/attendance/store/useAttendanceStore';
import { compressImage } from '../../lib/image/compress';

// Routerのモック
const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return {
    mockPush,
    mockRouter: {
      push: mockPush,
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// CreateAttendanceUseCaseのモック
const mockExecuteCreateAttendance = vi.fn();
vi.mock('../../features/attendance/usecase/createAttendanceUseCase', () => {
  return {
    CreateAttendanceUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteCreateAttendance,
      };
    }),
  };
});

// compressImageのモック
const { mockCompressImage } = vi.hoisted(() => {
  return {
    mockCompressImage: vi.fn().mockResolvedValue(new Blob(['compressed_data'], { type: 'image/jpeg' })),
  };
});

vi.mock('../../lib/image/compress', () => ({
  compressImage: (blob: any) => mockCompressImage(blob),
}));

describe('SCR-005: 撮影・送信画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useAttendanceStore.getState().clearAttendanceSession();

    // mediaDevices API のグローバルモック
    Object.defineProperty(global.navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [
            {
              stop: vi.fn(),
            },
          ],
        }),
      },
    });

    // URL.createObjectURL と revokeObjectURL のモック
    global.URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // HTMLCanvasElement getContext mock
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <PunchCapturePage />
      </ToastProvider>
    );
  };

  it('TST-SCR-005-001: 未ログイン状態でアクセスした際、/login に強制リダイレクトされること', async () => {
    sessionStorage.clear();

    renderComponent();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('TST-SCR-005-002: カメラ起動が拒否(NotAllowedError)された際、警告メッセージが表示されること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111-1111-1111-1111-111111111111');

    useAttendanceStore.getState().setPunchType('CLOCK_IN');
    useAttendanceStore.getState().setSelectedWorkerIds(['w111']);

    // getUserMedia が例外を投げる状況をモック
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(new Error('NotAllowedError'));

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('カメラの利用権限が必要です')).toBeInTheDocument();
    });
  });

  it('TST-SCR-005-003: シャッターボタン押下によりプレビュー表示が切り替わり、送信ボタンが活性化されること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111-1111-1111-1111-111111111111');

    useAttendanceStore.getState().setPunchType('CLOCK_IN');
    useAttendanceStore.getState().setSelectedWorkerIds(['w111']);

    // HTMLCanvasElement.prototype.toBlob をモック
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback) => {
      callback(new Blob(['mock_captured_image'], { type: 'image/jpeg' }));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    const captureButton = screen.getByRole('button', { name: /撮影する/ });
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(screen.getByAltText('撮影写真プレビュー')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'これで送信する' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '撮り直し' })).toBeInTheDocument();

    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  });

  it('TST-SCR-005-005: プレビュー決定後に送信ボタンを押下した際、画像が圧縮され打刻が正しく登録されて完了画面に遷移すること', async () => {
    sessionStorage.setItem('user_id', 'u1111111');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('display_name', '大島 茂');
    sessionStorage.setItem('contractor_id', 'c1111111-1111-1111-1111-111111111111');

    useAttendanceStore.getState().setPunchType('CLOCK_IN');
    useAttendanceStore.getState().setSelectedWorkerIds(['w111', 'w222']);

    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback) => {
      callback(new Blob(['mock_captured_image'], { type: 'image/jpeg' }));
    });

    mockExecuteCreateAttendance.mockResolvedValue({
      success: true,
      value: { photoObjectId: 'photo123', attendanceIds: ['a1', 'a2'] },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument();
    });

    // 撮影を実行
    const captureButton = screen.getByRole('button', { name: /撮影する/ });
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(screen.getByAltText('撮影写真プレビュー')).toBeInTheDocument();
    });

    // 送信
    const submitButton = screen.getByRole('button', { name: 'これで送信する' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCompressImage).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockExecuteCreateAttendance).toHaveBeenCalledWith({
        workerIds: ['w111', 'w222'],
        contractorId: 'c1111111-1111-1111-1111-111111111111',
        punchType: 'CLOCK_IN',
        photo: expect.any(Blob),
        punchedBy: 'u1111111',
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/contractor/punch-complete');
    });

    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  });
});

describe('compressImage: クライアント側リサイズ・画質圧縮のテスト', () => {
  it('TST-SCR-005-004: 長辺3000pxの画像を渡した際、最大長辺1280px以下に圧縮されてimage/jpegで返却されること', async () => {
    // ブラウザ API (FileReader, Image, Canvas) のモック
    const mockFileReader = {
      readAsDataURL: vi.fn().mockImplementation(function (this: any, file: Blob) {
        this.onload({ target: { result: 'data:image/jpeg;base64,mock_base64_data' } });
      }),
    };
    vi.stubGlobal('FileReader', vi.fn().mockImplementation(() => mockFileReader));

    const mockImage = {
      onload: vi.fn(),
      set src(value: string) {
        // 長辺3000px, 短辺2000pxのダミー画像をシミュレート
        this.width = 3000;
        this.height = 2000;
        setTimeout(() => this.onload(), 0);
      },
      width: 0,
      height: 0,
    };
    vi.stubGlobal('Image', vi.fn().mockImplementation(() => mockImage));

    const mockCanvas = {
      getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      toBlob: vi.fn().mockImplementation((callback) => {
        callback(new Blob(['mock_compressed_data'], { type: 'image/jpeg' }));
      }),
      width: 0,
      height: 0,
    };

    vi.stubGlobal('document', {
      createElement: vi.fn().mockImplementation((tagName) => {
        if (tagName === 'canvas') return mockCanvas;
        return {};
      }),
    });

    const { compressImage: actualCompressImage } = await vi.importActual<typeof import('../../lib/image/compress')>('../../lib/image/compress');

    const rawBlob = new Blob(['raw_large_image_data'], { type: 'image/jpeg' });
    const resultBlob = await actualCompressImage(rawBlob, 1280, 0.7);

    expect(resultBlob).toBeInstanceOf(Blob);
    expect(resultBlob.type).toBe('image/jpeg');

    // 縦横比を維持して長辺3000pxが1280pxに縮小される
    expect(mockCanvas.width).toBe(1280);
    expect(mockCanvas.height).toBe(853);
  });
});