import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CaptureAndSubmitPage from '@/app/(contractor)/attendance-capture/capture/page';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';
import { compressImage } from '@/features/attendance/usecase/compressImage';
import 'fake-indexeddb/auto';

// useRouter のモック
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// URL オブジェクトメソッドのモック
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:dummy-url');
global.URL.revokeObjectURL = vi.fn();

// HTMLCanvasElement の toBlob のモック
HTMLCanvasElement.prototype.toBlob = function (callback) {
  if (callback) {
    callback(new Blob(['compressed-image'], { type: 'image/jpeg' }));
  }
};

describe('SCR-005_capture_and_submit Page Tests', () => {
  let mockStream: any;
  const originalImage = global.Image;

  beforeEach(() => {
    vi.clearAllMocks();
    useAttendanceStore.setState({
      selectedWorkerIds: ['worker-1', 'worker-2'],
      punchType: 'CLOCK_IN',
    });

    // sessionStorage モックのクリア
    sessionStorage.clear();
    sessionStorage.setItem('user_id', 'user-123');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('contractor_id', 'contractor-456');

    // getContext のモック
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as any);

    // カメラストリームのモック
    mockStream = {
      getTracks: vi.fn().mockReturnValue([
        {
          stop: vi.fn(),
        },
      ]),
    };

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    // Image オブジェクトのモック (jsdom環境で compressImage がハングするのを防ぐ)
    const dummyImage = {
      width: 1280,
      height: 720,
      src: '',
      onload: () => {},
    };

    global.Image = vi.fn().mockImplementation(() => {
      const img = dummyImage as any;
      setTimeout(() => {
        if (img.onload) img.onload();
      }, 0);
      return img;
    }) as any;
  });

  afterEach(() => {
    global.Image = originalImage;
    vi.restoreAllMocks();
  });

  test('TST-SCR-005-001: 未認証状態の場合はログイン画面へリダイレクトされること', async () => {
    sessionStorage.clear();

    render(<CaptureAndSubmitPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  test('TST-SCR-005-002: カメラデバイスの正常応答時にGetUserMediaが呼び出されること', async () => {
    render(<CaptureAndSubmitPage />);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });
  });

  test('TST-SCR-005-003: カメラデバイスへのアクセス拒否時にエラーメッセージが表示されること', async () => {
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValue(new Error('NotAllowedError'));

    render(<CaptureAndSubmitPage />);

    await waitFor(() => {
      expect(screen.getByText(/カメラへのアクセスが拒否されました/)).toBeInTheDocument();
    });
  });

  test('TST-SCR-005-004: 初期表示状態では送信ボタンが表示されていない、あるいは非活性であること', async () => {
    render(<CaptureAndSubmitPage />);

    await waitFor(() => {
      // 撮影前の状態なので、「撮影」ボタンが表示され、「送信」ボタンは表示されていないことを確認
      expect(screen.getByRole('button', { name: '撮影' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '送信' })).not.toBeInTheDocument();
    });
  });

  test('TST-SCR-005-005: 撮影ボタンクリックでプレビューが表示され、送信ボタンが活性化すること', async () => {
    render(<CaptureAndSubmitPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '撮影' })).toBeInTheDocument();
    });

    const captureButton = screen.getByRole('button', { name: '撮影' });
    fireEvent.click(captureButton);

    await waitFor(() => {
      // 送信ボタンと撮り直しボタンが表示されることを確認
      expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '撮り直し' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '送信' })).not.toBeDisabled();
    });
  });

  test('TST-SCR-005-006: 撮り直しボタンクリックでビデオが再表示され、送信ボタンが消えること', async () => {
    render(<CaptureAndSubmitPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '撮影' })).toBeInTheDocument();
    });

    // 撮影
    fireEvent.click(screen.getByRole('button', { name: '撮影' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '撮り直し' })).toBeInTheDocument();
    });

    // 撮り直し
    fireEvent.click(screen.getByRole('button', { name: '撮り直し' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '撮影' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '送信' })).not.toBeInTheDocument();
    });
  });

  test('TST-SCR-005-008: 送信ボタンクリックによってデータが保存され、完了画面へ遷移すること', async () => {
    render(<CaptureAndSubmitPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '撮影' })).toBeInTheDocument();
    });

    // 撮影してプレビュー状態へ
    fireEvent.click(screen.getByRole('button', { name: '撮影' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '送信' })).toBeInTheDocument();
    });

    // 送信
    fireEvent.click(screen.getByRole('button', { name: '送信' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/punch/complete?type=CLOCK_IN&count=2');
    });
  });

  test('TST-SCR-005-010: 戻るボタンのクリックでカメラが停止し、前画面（worker-select）へ遷移すること', async () => {
    render(<CaptureAndSubmitPage />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '戻る' })[0]).toBeInTheDocument();
    });

    const backButton = screen.getAllByRole('button', { name: '戻る' })[0];
    fireEvent.click(backButton);

    // 全トラック停止関数の呼び出しを確認
    const track = mockStream.getTracks()[0];
    expect(track.stop).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/contractor/worker-select');
  });
});