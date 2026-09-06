import "fake-indexeddb/auto";
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import "@testing-library/jest-dom";
import PunchCameraPage from '@/app/(contractor)/punch-camera/page';
import { useAttendanceStore } from '@/features/attendance/store/useAttendanceStore';
import { compressImage } from '@/lib/image/compress';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { IndexedDBAttendanceRepository } from '@/features/attendance/repository/indexedDBAttendanceRepository';
import { initDB } from '@/lib/db';

// Next.js routerモック
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
    };
  },
}));

// Canvas toBlobとgetContextのjsdomポリフィル
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback) => {
    callback(new Blob(['compressed-image'], { type: 'image/jpeg' }));
  });

  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
    if (contextId === '2d') {
      return {
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
      };
    }
    return null;
  });
}

describe('SCR-005 撮影・送信画面（PunchCameraPage） テスト', () => {
  let mockStream: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // Canvas toBlobとgetContextの再モック
    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback) => {
      callback(new Blob(['compressed-image'], { type: 'image/jpeg' }));
    });

    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
      if (contextId === '2d') {
        return {
          drawImage: vi.fn(),
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          getImageData: vi.fn(),
          putImageData: vi.fn(),
          createImageData: vi.fn(),
        };
      }
      return null;
    });

    // データベース初期設定
    const db = await initDB();
    const tx = db.transaction('users', 'readwrite');
    await tx.objectStore('users').put({
      user_id: 'usr-001',
      contractor_id: 'con-001',
      role: 'CONTRACTOR_MANAGER',
      login_id: 'manager',
      password_hash: 'pass',
      display_name: '外注先管理者A',
      status: 'ACTIVE',
      created_at: '2026-04-13T00:00:00+09:00',
      updated_at: '2026-04-13T00:00:00+09:00',
    });
    await tx.done;

    // mediaDevicesモック
    mockStream = {
      getTracks: vi.fn().mockReturnValue([
        {
          stop: vi.fn(),
        },
      ]),
    };

    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    // URL.createObjectURL/revokeObjectURLポリフィル
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('SCR-005-UT-001: 写真未撮影状態では「送信」ボタンが表示されず、プレビューのみの状態か撮影前状態であること（撮影後はじめて送信・撮り直しボタンが表示される）', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    useAttendanceStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: ['wrk-001'],
    });

    render(<PunchCameraPage />);

    // 撮影ボタン（capture-btn）が表示されるのを待つ
    const captureBtn = await screen.findByTestId('capture-btn');
    expect(captureBtn).toBeInTheDocument();

    // 送信ボタンが存在しないことを確認
    expect(screen.queryByTestId('submit-btn')).not.toBeInTheDocument();
  });

  it('SCR-005-UT-002: getUserMediaが権限拒否などで例外をthrowした際、エラー表示がされること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    useAttendanceStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: ['wrk-001'],
    });

    // getUserMediaが失敗を返すように設定
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));

    render(<PunchCameraPage />);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-message')).toHaveTextContent('カメラの利用権限を許可してください。');
  });

  it('SCR-005-UT-003: 画像圧縮ユーティリティ関数が、アスペクト比を維持しつつ長辺1280px以下にリサイズして圧縮すること', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 2000;

    const blob = await compressImage(canvas, 1280, 0.7);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
  });

  it('SCR-005-UT-004: 未認証状態でアクセスされた場合、ログイン画面へリダイレクトされること', async () => {
    useAttendanceStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: ['wrk-001'],
    });

    render(<PunchCameraPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('SCR-005-ET-001: 正常な写真撮影後、送信ボタン押下でIndexedDBへ保存が完了し、完了画面に遷移すること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    useAttendanceStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: ['wrk-001'],
    });

    render(<PunchCameraPage />);

    // 撮影ボタンが表示されるのを待つ
    const captureBtn = await screen.findByTestId('capture-btn');
    fireEvent.click(captureBtn);

    // プレビュー表示・送信ボタンの確認
    const previewImg = await screen.findByTestId('captured-preview');
    expect(previewImg).toBeInTheDocument();

    const submitBtn = await screen.findByTestId('submit-btn');
    expect(submitBtn).toBeInTheDocument();

    // 送信するボタンをクリック
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/punch-complete');
    });
  });

  it('SCR-005-ET-002: 戻るボタンが押下された場合、作業員選択画面へ戻ること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    useAttendanceStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: ['wrk-001'],
    });

    render(<PunchCameraPage />);

    await waitFor(() => {
      expect(screen.getByTestId('back-btn')).toBeInTheDocument();
    });

    const backBtn = screen.getByTestId('back-btn');
    fireEvent.click(backBtn);

    expect(mockPush).toHaveBeenCalledWith('/workers-select');
  });

  it('SCR-005-ET-003: 撮影ボタンクリック時にビデオストリームから切り出された画像がプレビュー表示され、ストリーミングが停止すること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    useAttendanceStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: ['wrk-001'],
    });

    render(<PunchCameraPage />);

    const captureBtn = await screen.findByTestId('capture-btn');
    fireEvent.click(captureBtn);

    const previewImg = await screen.findByTestId('captured-preview');
    expect(previewImg).toBeInTheDocument();

    expect(screen.queryByTestId('camera-stream')).not.toBeInTheDocument();
    expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('SCR-005-ET-004: 撮り直しボタン押下時にプレビュー画像が消去され、再びカメラが起動されること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    useAttendanceStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: ['wrk-001'],
    });

    render(<PunchCameraPage />);

    // 1回目の撮影
    const captureBtn = await screen.findByTestId('capture-btn');
    fireEvent.click(captureBtn);

    const previewImg = await screen.findByTestId('captured-preview');
    expect(previewImg).toBeInTheDocument();

    // 撮り直す
    const retakeBtn = await screen.findByTestId('retake-btn');
    fireEvent.click(retakeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('camera-stream')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('captured-preview')).not.toBeInTheDocument();
  });

  it('SCR-005-ET-005: 保存処理中に何らかのエラー（データベース保存失敗など）が起きた際、適切なエラーメッセージが画面に表示されること', async () => {
    sessionStorage.setItem('user_id', 'usr-001');
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    useAttendanceStore.setState({
      punchType: 'CLOCK_IN',
      selectedWorkerIds: ['wrk-001'],
    });

    // 意図的なデータベースエラーを誘発するためにトランザクションを破壊
    vi.spyOn(IndexedDBAttendanceRepository.prototype, 'savePhotoBlob').mockRejectedValue(
      new Error('QuotaExceededError')
    );

    render(<PunchCameraPage />);

    const captureBtn = await screen.findByTestId('capture-btn');
    fireEvent.click(captureBtn);

    const submitBtn = await screen.findByTestId('submit-btn');
    fireEvent.click(submitBtn);

    const errorMsg = await screen.findByTestId('error-message');
    expect(errorMsg).toBeInTheDocument();

    expect(errorMsg).toHaveTextContent('保存に失敗しました。もう一度お試しください。');
  });
});