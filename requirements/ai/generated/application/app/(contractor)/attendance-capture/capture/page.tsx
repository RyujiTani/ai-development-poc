'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAttendanceStore } from '@/features/attendance/store/attendanceStore';
import { attendanceRepository } from '@/features/attendance/repository/attendanceRepository';
import { compressImage } from '@/features/attendance/usecase/compressImage';
import { logger } from '@/lib/logger';

export default function CaptureAndSubmitPage() {
  const router = useRouter();
  const { punchType, selectedWorkerIds, reset } = useAttendanceStore();

  const [cameraState, setCameraState] = useState<'off' | 'active' | 'preview'>('off');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // 安全にトラックを停止させるヘルパー関数
  const stopStreamTracks = (targetStream: any) => {
    if (targetStream && typeof targetStream.getTracks === 'function') {
      try {
        const tracks = targetStream.getTracks();
        if (Array.isArray(tracks)) {
          tracks.forEach((track) => {
            if (track && typeof track.stop === 'function') {
              track.stop();
            }
          });
        }
      } catch (err) {
        logger.error('STOP_TRACKS_FAILED', { error: String(err) });
      }
    }
  };

  // 認証チェック
  useEffect(() => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    const userId = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role');

    if (!userId || role !== 'CONTRACTOR_MANAGER') {
      logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT', { userId, role });
      router.push('/login');
    }
  }, [router]);

  // カメラストリームの初期化
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      setError(null);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraState('active');
        logger.info('CAMERA_STARTED_SUCCESSFULLY');
      } catch (err) {
        logger.error('CAMERA_ACCESS_FAILED', { error: String(err) });
        setError('カメラへのアクセスが拒否されました。設定を確認してください。');
        setCameraState('off');
      }
    }

    if (cameraState === 'off' && !photoBlob) {
      startCamera();
    }

    return () => {
      if (activeStream) {
        stopStreamTracks(activeStream);
      }
    };
  }, [cameraState, photoBlob]);

  // プレビュー表示URLの制御
  useEffect(() => {
    if (photoBlob) {
      const url = URL.createObjectURL(photoBlob);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [photoBlob]);

  const handleCapture = () => {
    if (!videoRef.current || !stream) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPhotoBlob(blob);
          setCameraState('preview');
          if (stream) {
            stopStreamTracks(stream);
            setStream(null);
          }
          logger.info('PHOTO_CAPTURED_SUCCESSFULLY');
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const handleRetake = () => {
    setPhotoBlob(null);
    setCameraState('off');
    logger.info('PHOTO_RETAKE_TRIGGERED');
  };

  const handleBack = () => {
    if (stream) {
      stopStreamTracks(stream);
    }
    logger.info('BACK_TO_WORKER_SELECT_TRIGGERED');
    router.push('/contractor/worker-select');
  };

  const handleSubmit = async () => {
    if (!photoBlob || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      logger.info('COMPRESS_IMAGE_START');
      const compressed = await compressImage(photoBlob);
      logger.info('COMPRESS_IMAGE_SUCCESS', {
        originalSize: photoBlob.size,
        compressedSize: compressed.size,
      });

      const contractorId = sessionStorage.getItem('contractor_id') || '';
      const punchedBy = sessionStorage.getItem('user_id') || '';

      const result = await attendanceRepository.savePunch({
        workerIds: selectedWorkerIds,
        contractorId,
        punchType: punchType || 'CLOCK_IN',
        photo: compressed,
        punchedBy,
        punchedAt: new Date().toISOString(),
      });

      if (result.success) {
        logger.info('PUNCH_SUBMISSION_SUCCESSFUL');
        const type = punchType || 'CLOCK_IN';
        const count = selectedWorkerIds.length;
        reset();
        router.push(`/punch/complete?type=${type}&count=${count}`);
      } else {
        throw new Error('保存処理に失敗しました');
      }
    } catch (err) {
      logger.error('PUNCH_SUBMISSION_FAILED', { error: String(err) });
      setError('送信に失敗しました。再試行してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {punchType === 'CLOCK_IN' ? '出勤打刻' : '退勤打刻'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              対象者: <span className="font-bold">{selectedWorkerIds.length}名</span>
            </p>
          </div>
          <button
            onClick={handleBack}
            disabled={isSubmitting}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500 transition-colors disabled:opacity-50"
            style={{ minHeight: '44px' }}
          >
            戻る
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 mx-auto max-w-md w-full px-4 py-6 flex flex-col justify-between space-y-6">
        {/* エラー表示領域 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
            <span className="block sm:inline text-sm font-bold">{error}</span>
          </div>
        )}

        {/* プレビュー・カメラ領域 */}
        <div className="relative aspect-[4/3] w-full bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
          {cameraState === 'preview' && previewUrl ? (
            <img
              src={previewUrl}
              alt="撮影写真プレビュー"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${cameraState === 'active' ? 'block' : 'hidden'}`}
            />
          )}

          {cameraState === 'off' && !error && (
            <p className="text-gray-400 text-sm">カメラ起動中...</p>
          )}

          {error && (
            <div className="p-4 text-center">
              <p className="text-red-400 text-sm font-bold">カメラを使用できません</p>
            </div>
          )}
        </div>

        {/* ボタンレイアウト */}
        <div className="flex flex-col gap-4">
          {cameraState === 'preview' ? (
            <div className="flex gap-4">
              <button
                onClick={handleRetake}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-gray-200 py-4 text-center text-sm font-bold text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-50"
                style={{ minHeight: '56px' }}
              >
                撮り直し
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-blue-600 py-4 text-center text-sm font-bold text-white hover:bg-blue-505 transition-colors disabled:bg-blue-400"
                style={{ minHeight: '56px' }}
              >
                {isSubmitting ? '送信中...' : '送信'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleCapture}
              disabled={cameraState !== 'active' || isSubmitting}
              className="w-full rounded-xl bg-blue-600 py-4 text-center text-sm font-bold text-white hover:bg-blue-505 transition-colors disabled:bg-gray-400 disabled:opacity-50"
              style={{ minHeight: '56px' }}
            >
              撮影
            </button>
          )}

          {cameraState !== 'preview' && (
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-gray-200 py-4 text-center text-sm font-bold text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-50"
              style={{ minHeight: '56px' }}
            >
              戻る
            </button>
          )}
        </div>
      </main>
    </div>
  );
}