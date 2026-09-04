import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import PunchCapturePage from '../app/(contractor)/punch/capture/page';
import * as mockAuth from '../lib/auth/mockAuth';

// ----------------------------------------------------
// Next.js Navigation Mock
// ----------------------------------------------------
const { mockPush, mockReplace, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  return {
    mockPush,
    mockReplace,
    mockRouter: {
      push: mockPush,
      replace: mockReplace,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    },
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/punch/capture',
  useSearchParams: () => new URLSearchParams(),
}));

// ----------------------------------------------------
// IndexedDB Repos / UseCase Mocks
// ----------------------------------------------------
const mockSavePunch = vi.fn().mockResolvedValue(undefined);

vi.mock('../features/attendance/repository/attendanceRepository', () => {
  return {
    IndexedDBAttendanceRepository: vi.fn().mockImplementation(() => {
      return {
        savePunch: mockSavePunch,
      };
    }),
  };
});

// ----------------------------------------------------
// Global Browser Feature Mocking
// ----------------------------------------------------
const mockStream = {
  getTracks: () => [
    {
      stop: vi.fn(),
    },
  ],
};

const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Canvas mock implementation for jsdom environment
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (contextId) {
    if (contextId === '2d') {
      return {
        drawImage: vi.fn(),
      } as any;
    }
    return null;
  };

  HTMLCanvasElement.prototype.toDataURL = function () {
    return 'data:image/jpeg;base64,dummy';
  };

  HTMLCanvasElement.prototype.toBlob = function (callback) {
    if (callback) {
      callback(new Blob(['dummy-image'], { type: 'image/jpeg' }));
    }
  };
}

// Image mock implementation for jsdom environment to trigger onload
if (typeof window !== 'undefined') {
  class MockImage {
    _src: string = '';
    onload: (() => void) | null = null;
    onerror: ((err: any) => void) | null = null;
    width: number = 2000;
    height: number = 2000;

    get src() {
      return this._src;
    }

    set src(value: string) {
      this._src = value;
      setTimeout(() => {
        if (this.onload) {
          this.onload();
        }
      }, 0);
    }
  }
  window.Image = MockImage as any;
  global.Image = MockImage as any;
}

describe('SCR-005: 撮影・送信画面 (PunchCapturePage)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // Default: Authenticated contractor manager session
    vi.spyOn(mockAuth, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(mockAuth, 'getSession').mockReturnValue({
      userId: 'user-001',
      contractorId: 'contractor-abc',
      role: 'CONTRACTOR_MANAGER',
      displayName: 'テスト外注先管理者',
    });

    // Default: valid draft in session storage
    sessionStorage.setItem(
      'worker_attendance_punch_draft',
      JSON.stringify({
        selectedWorkerIds: ['worker-1', 'worker-2'],
        punchType: 'CLOCK_IN',
        workerCount: 2,
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('SCR-005-UT-001: 正常表示とカメラプレビュー自動起動', async () => {
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    render(<PunchCapturePage />);

    // 画面上部に選択モード(出勤)と人数が表示されているか
    expect(screen.getByText('出勤')).toBeInTheDocument();
    expect(screen.getByText('対象作業員')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 作業員数

    // カメラ読み込み中から開始される
    expect(screen.getByText('カメラを起動しています...')).toBeInTheDocument();

    // getUserMedia が呼ばれ STREAMING に遷移する
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });
  });

  it('SCR-005-UT-002: 撮影アクションでストリーム停止＆プレビュー表示', async () => {
    render(<PunchCapturePage />);

    // STREAMING状態になるのを待つ
    await waitFor(() => {
      expect(screen.getByLabelText('カメラ映像プレビュー')).toBeInTheDocument();
    });

    // 撮影ボタン押下
    const captureBtn = screen.getByText('📸 写真を撮影する');
    await act(async () => {
      fireEvent.click(captureBtn);
    });

    // 状態が CAPTURED に変更され、撮影した写真プレビューが表示される
    expect(screen.getByLabelText('撮影された写真のプレビュー')).toBeInTheDocument();
    expect(screen.queryByLabelText('カメラ映像プレビュー')).not.toBeInTheDocument();
    expect(screen.getByText('✨ 打刻データを送信する')).toBeInTheDocument();
    expect(screen.getByText('🔄 撮り直す')).toBeInTheDocument();
  });

  it('SCR-005-UT-003: 撮り直しアクションでカメラが再起動する', async () => {
    render(<PunchCapturePage />);

    // カメラ起動完了
    await waitFor(() => {
      expect(screen.getByLabelText('カメラ映像プレビュー')).toBeInTheDocument();
    });

    // 撮影
    const captureBtn = screen.getByText('📸 写真を撮影する');
    await act(async () => {
      fireEvent.click(captureBtn);
    });

    // プレビューの存在確認
    expect(screen.getByLabelText('撮影された写真のプレビュー')).toBeInTheDocument();

    // 撮り直し
    const retakeBtn = screen.getByText('🔄 撮り直す');
    await act(async () => {
      fireEvent.click(retakeBtn);
    });

    // カメラストリームが再起動されること
    await waitFor(() => {
      expect(screen.getByLabelText('カメラ映像プレビュー')).toBeInTheDocument();
    });
  });

  it('SCR-005-UT-005: 初期状態（未撮影）では送信ボタンが表示されない（非活性を代替）', async () => {
    render(<PunchCapturePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('カメラ映像プレビュー')).toBeInTheDocument();
    });

    // 送信ボタンがDOMにそもそも存在しないことで誤送信を完全防御
    expect(screen.queryByText('✨ 打刻データを送信する')).not.toBeInTheDocument();
  });

  it('SCR-005-UT-006: カメラ起動拒否時にエラーガイダンスを表示する', async () => {
    const notAllowedError = new Error('Permission denied');
    notAllowedError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValueOnce(notAllowedError);

    render(<PunchCapturePage />);

    await waitFor(() => {
      const errorElements = screen.getAllByText(
        'カメラへのアクセスが拒否されました。設定より権限を許可してください。'
      );
      expect(errorElements.length).toBeGreaterThan(0);
    });

    // 再起動ボタンが表示されていること
    expect(screen.getByText('カメラを再起動する')).toBeInTheDocument();
  });

  it('SCR-005-E2E-001: 撮影から打刻送信成功で完了画面へ遷移する', async () => {
    mockSavePunch.mockResolvedValueOnce(undefined);

    render(<PunchCapturePage />);

    // 1. カメラ起動
    await waitFor(() => {
      expect(screen.getByLabelText('カメラ映像プレビュー')).toBeInTheDocument();
    });

    // 2. 撮影
    const captureBtn = screen.getByText('📸 写真を撮影する');
    await act(async () => {
      fireEvent.click(captureBtn);
    });

    // 3. 送信
    const submitBtn = screen.getByText('✨ 打刻データを送信する');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // 送信後の状態確認（IndexedDB保存が呼ばれ、/punch/completeへ遷移する）
    await waitFor(() => {
      expect(mockSavePunch).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/punch/complete');
    });
  });

  it('SCR-005-E2E-002: 戻るボタン押下で前画面へ遷移する', async () => {
    render(<PunchCapturePage />);

    const backBtn = screen.getByText('← 戻る');
    await act(async () => {
      fireEvent.click(backBtn);
    });

    expect(mockPush).toHaveBeenCalledWith('/punch/worker-select');
  });

  it('SCR-005-VL-003: 未認証状態の場合はログイン画面へリダイレクトされる', async () => {
    vi.spyOn(mockAuth, 'isAuthenticated').mockReturnValueOnce(false);

    render(<PunchCapturePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });
});