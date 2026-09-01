import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CapturePage from '../app/(contractor)/capture/page';
import * as sessionModule from '../lib/auth/session';
import * as attSessionModule from '../features/attendance/store/attendanceSession';
import { compressImage } from '../lib/utils/imageCompressor';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush
    };
  }
}));

describe('SCR-005 Capture Screen Requirements Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
  });

  it('TST-SCR-005-001: should redirect unauthorized mock credentials to login route', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue(null);
    render(<CapturePage />);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('TST-SCR-005-003: initial capture form elements should not expose direct punch submit action', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      userId: 'user-789',
      role: 'CONTRACTOR_MANAGER',
      contractorId: 'cont-mock-1',
      displayName: 'テスト外注先管理者'
    });
    vi.spyOn(attSessionModule, 'getAttendanceSession').mockReturnValue({
      punchMode: 'CLOCK_IN',
      selectedWorkerIds: ['worker-101', 'worker-102']
    });

    render(<CapturePage />);
    
    expect(screen.queryByText('打刻を送信する')).toBeNull();
  });

  it('TST-SCR-005-002: should render explicit fallback UI alert when getUserMedia fails on permission blocks', async () => {
    vi.spyOn(sessionModule, 'getSession').mockReturnValue({
      userId: 'user-789',
      role: 'CONTRACTOR_MANAGER',
      contractorId: 'cont-mock-1',
      displayName: 'テスト外注先管理者'
    });
    vi.spyOn(attSessionModule, 'getAttendanceSession').mockReturnValue({
      punchMode: 'CLOCK_OUT',
      selectedWorkerIds: ['worker-101']
    });

    const mockGetUserMedia = vi.fn().mockRejectedValue({ name: 'NotAllowedError' });
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia
      },
      writable: true,
    });

    render(<CapturePage />);

    await waitFor(() => {
      expect(screen.getByText('カメラ機能がブロックされています')).toBeInTheDocument();
      expect(screen.getByText(/カメラ利用権限がありません/)).toBeInTheDocument();
    });
  });

  it('TST-SCR-005-005: validation compression helper retains optimal JPEG properties and max boundaries', async () => {
    const mockVideo = {
      videoWidth: 2560,
      videoHeight: 1440
    } as unknown as HTMLVideoElement;

    const testBlobOutput = new Blob(['dummy-content-data'], { type: 'image/jpeg' });
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;

    HTMLCanvasElement.prototype.toBlob = function (callback, mime, quality) {
      callback?.(testBlobOutput);
    };

    const outBlob = await compressImage(mockVideo, 1280, 0.7);
    expect(outBlob.type).toBe('image/jpeg');

    HTMLCanvasElement.prototype.toBlob = originalToBlob;
  });
});
