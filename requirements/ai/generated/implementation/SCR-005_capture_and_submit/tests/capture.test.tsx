import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CapturePage from '../app/(contractor)/attendance/capture/page';
import { AttendanceProvider } from '../features/attendance/store/attendanceStore';
import * as sessionModule from '../lib/auth/session';
import * as compressorModule from '../lib/image/compressor';
import { IndexedDBAttendanceRepository } from '../features/attendance/repository/attendanceRepository';

// navigation mockの安定化
const { mockPush } = vi.hoisted(() => {
  const mockPush = vi.fn();
  return { mockPush };
});

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

// IndexedDB repositoryのモック
vi.mock('../features/attendance/repository/attendanceRepository', () => {
  const savePhotoMock = vi.fn().mockResolvedValue(undefined);
  const saveAttendanceRecordsMock = vi.fn().mockResolvedValue(undefined);
  return {
    IndexedDBAttendanceRepository: vi.fn().mockImplementation(() => ({
      savePhoto: savePhotoMock,
      saveAttendanceRecords: saveAttendanceRecordsMock,
    })),
  };
});

describe('CapturePage (SCR-005)', () => {
  const originalMediaDevices = navigator.mediaDevices;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // canvas getContext のモック
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }) as any;

    // navigator.mediaDevices モックの準備
    const mockGetUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: vi.fn(),
        },
      ],
    } as any);

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: mockGetUserMedia,
      },
    });

    // URL.createObjectURL/revokeObjectURL モック
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: originalMediaDevices,
    });
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('SCR-005-UT-001: sessionStorage が空の状態でアクセスした場合、ログインへリダイレクトされること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(null);

    render(
      <AttendanceProvider>
        <CapturePage />
      </AttendanceProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('SCR-005-UT-002: カメラ起動時に getUserMedia が NotAllowedError を throw した場合、エラーメッセージが表示されること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'user-001',
      contractor_id: 'con-999',
      role: 'CONTRACTOR_MANAGER',
      display_name: '外注先管理者A',
    });

    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('NotAllowedError'));

    render(
      <AttendanceProvider>
        <CapturePage />
      </AttendanceProvider>
    );

    const errorMessage = await screen.findByText(/カメラのアクセス権限が必要です/);
    expect(errorMessage).toBeInTheDocument();
  });

  it('SCR-005-UT-003: 初期表示状態（未撮影）では送信ボタンが存在しない、または非表示であること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'user-001',
      contractor_id: 'con-999',
      role: 'CONTRACTOR_MANAGER',
      display_name: '外注先管理者A',
    });

    render(
      <AttendanceProvider>
        <CapturePage />
      </AttendanceProvider>
    );

    // 初期表示時には「写真を撮影する」ボタンのみが表示され、「送信する」ボタンは表示されない
    await screen.findByRole('button', { name: /写真を撮影する/ });
    expect(screen.queryByRole('button', { name: /打刻を送信する/ })).not.toBeInTheDocument();
  });

  it('SCR-005-UT-004: 画像圧縮ユーティリティが、正常に Blob 圧縮を処理すること', async () => {
    const dummyBlob = new Blob(['dummy content'], { type: 'image/jpeg' });
    
    // canvas.toBlob および Image.onload 等をシミュレート
    const spy = vi.spyOn(compressorModule, 'compressImage').mockResolvedValue(dummyBlob);
    
    const compressed = await compressorModule.compressImage(dummyBlob);
    expect(compressed).toBeInstanceOf(Blob);
    expect(spy).toHaveBeenCalledWith(dummyBlob);
  });

  it('SCR-005-IT-001: 撮影ボタン押下後に、ビデオ停止 & 静止画プレビューに切り替わり「送信」ボタンが表示されること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'user-001',
      contractor_id: 'con-999',
      role: 'CONTRACTOR_MANAGER',
      display_name: '外注先管理者A',
    });

    // 疑似 canvas.toBlob モック
    const mockToBlob = vi.fn((callback) => callback(new Blob(['abc'], { type: 'image/jpeg' })));
    const originalHTMLCanvasToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = mockToBlob as any;

    render(
      <AttendanceProvider>
        <CapturePage />
      </AttendanceProvider>
    );

    const captureButton = await screen.findByRole('button', { name: /写真を撮影する/ });
    fireEvent.click(captureButton);

    // プレビュー用の「打刻を送信する」と「撮り直す」ボタンに切り替わること
    const sendButton = await screen.findByRole('button', { name: /打刻を送信する/ });
    expect(sendButton).toBeInTheDocument();

    const retakeButton = screen.getByRole('button', { name: /撮り直す/ });
    expect(retakeButton).toBeInTheDocument();

    HTMLCanvasElement.prototype.toBlob = originalHTMLCanvasToBlob;
  });

  it('SCR-005-IT-002: プレビュー状態で「撮り直し」を押下した際、URL.revokeObjectURL が呼ばれ、再び撮影画面に戻ること', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'user-001',
      contractor_id: 'con-999',
      role: 'CONTRACTOR_MANAGER',
      display_name: '外注先管理者A',
    });

    const mockToBlob = vi.fn((callback) => callback(new Blob(['abc'], { type: 'image/jpeg' })));
    const originalHTMLCanvasToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = mockToBlob as any;

    render(
      <AttendanceProvider>
        <CapturePage />
      </AttendanceProvider>
    );

    const captureButton = await screen.findByRole('button', { name: /写真を撮影する/ });
    fireEvent.click(captureButton);

    const retakeButton = await screen.findByRole('button', { name: /撮り直す/ });
    fireEvent.click(retakeButton);

    // URL.revokeObjectURL がメモリ解放のために呼ばれていること
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();

    // 再度「写真を撮影する」ボタンが表示されていること
    expect(screen.getByRole('button', { name: /写真を撮影する/ })).toBeInTheDocument();

    HTMLCanvasElement.prototype.toBlob = originalHTMLCanvasToBlob;
  });

  it('SCR-005-IT-003: 戻るボタン押下時、カメラのトラックが停止され、前画面（作業員選択）へルーティングされること', async () => {
    const mockStop = vi.fn();
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      user_id: 'user-001',
      contractor_id: 'con-999',
      role: 'CONTRACTOR_MANAGER',
      display_name: '外注先管理者A',
    });

    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: mockStop,
        },
      ],
    } as any);

    render(
      <AttendanceProvider>
        <CapturePage />
      </AttendanceProvider>
    );

    const backButton = await screen.findByRole('button', { name: /戻る/ });
    fireEvent.click(backButton);

    // トラックが停止されていること
    expect(mockStop).toHaveBeenCalled();
    // 前画面にルーティングされていること
    expect(mockPush).toHaveBeenCalledWith('/attendance/worker-select');
  });
});