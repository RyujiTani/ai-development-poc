"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAttendanceStore } from '@/features/attendance/store/useAttendanceStore';
import { IndexedDBUserRepository } from '@/features/user/repository/indexedDBUserRepository';
import { IndexedDBAttendanceRepository } from '@/features/attendance/repository/indexedDBAttendanceRepository';
import { CreatePunchUseCase } from '@/features/attendance/usecase/createPunchUseCase';
import { User } from '@/features/user/domain/types';
import { compressImage } from '@/lib/image/compress';
import { logger } from '@/lib/logger';

export default function PunchCameraPage() {
  const router = useRouter();
  const { punchType, selectedWorkerIds } = useAttendanceStore();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // カメラ・ストリーミング状態
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPermissionState, setCameraPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const checkAuthAndInit = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'CONTRACTOR_MANAGER') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/punch-camera' });
        router.replace('/login');
        return;
      }

      if (selectedWorkerIds.length === 0) {
        logger.info('NO_WORKERS_SELECTED_REDIRECT');
        router.replace('/workers-select');
        return;
      }

      try {
        const userRepository = new IndexedDBUserRepository();
        const user = await userRepository.findById(userId);
        if (!user || user.status !== 'ACTIVE') {
          router.replace('/login');
          return;
        }

        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (error) {
        logger.error('AUTH_INIT_ERROR', error);
        router.replace('/login');
      }
    };

    checkAuthAndInit();
  }, [router, selectedWorkerIds]);

  const startCamera = async () => {
    try {
      setErrorMessage(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });

      setStream(mediaStream);
      setCameraPermissionState('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      logger.error('CAMERA_ACCESS_ERROR', err);
      setCameraPermissionState('denied');
      setErrorMessage('カメラの利用権限を許可してください。');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isAuthenticated]);

  const handleCapture = async () => {
    if (!videoRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setErrorMessage('キャプチャ処理に失敗しました。');
        return;
      }

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // クライアント側画像圧縮処理
      const compressedBlob = await compressImage(canvas);
      setCapturedPhoto(compressedBlob);

      const objectUrl = URL.createObjectURL(compressedBlob);
      setPreviewUrl(objectUrl);

      // ストリームを停止
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }

      logger.info('PHOTO_CAPTURED_AND_COMPRESSED', { size: compressedBlob.size });
    } catch (err) {
      logger.error('CAPTURE_ERROR', err);
      setErrorMessage('写真の撮影に失敗しました。');
    }
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setCapturedPhoto(null);
    setPreviewUrl(null);
    startCamera();
    logger.info('CAMERA_RETAKE_TRIGGERED');
  };

  const handleSubmit = async () => {
    if (!capturedPhoto || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const repository = new IndexedDBAttendanceRepository();
      const useCase = new CreatePunchUseCase(repository);

      const result = await useCase.execute({
        workerIds: selectedWorkerIds,
        contractorId: currentUser?.contractor_id || '',
        punchType: punchType || 'CLOCK_IN',
        photo: capturedPhoto,
        punchedBy: currentUser?.user_id || '',
        punchedAt: new Date().toISOString(),
      });

      if (result.success) {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        router.push('/punch-complete');
      } else if ('error' in result) {
        setErrorMessage(result.error.message);
      }
    } catch (err) {
      logger.error('PUNCH_SUBMIT_SYSTEM_ERROR', err);
      setErrorMessage('保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    logger.info('NAVIGATE_BACK_TO_WORKERS_SELECT');
    router.push('/workers-select');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー領域 */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
              証拠写真撮影
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {punchType === 'CLOCK_IN' ? '出勤モード' : '退勤モード'}: {selectedWorkerIds.length} 名選択中
              </span>
            </div>
          </div>
          <button
            onClick={handleBack}
            className="flex items-center justify-center h-10 px-4 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            data-testid="back-btn"
          >
            戻る
          </button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 flex flex-col justify-between">
        {errorMessage && (
          <div
            className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex justify-between items-center"
            role="alert"
            data-testid="error-message"
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-950 font-bold hover:opacity-80 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              閉じる
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center">
          {/* カメラプレビュー/写真プレビュー領域 */}
          <div className="w-full max-w-lg aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-lg border-4 border-white relative flex items-center justify-center">
            {cameraPermissionState === 'denied' ? (
              <div className="text-center p-6 text-white" data-testid="camera-error-view">
                <p className="text-lg font-bold mb-2">カメラが利用できません</p>
                <p className="text-sm text-gray-400">カメラの利用権限を許可してください。</p>
              </div>
            ) : previewUrl ? (
              // 撮影済み写真のプレビュー表示
              <img
                src={previewUrl}
                alt="Captured Preview"
                className="w-full h-full object-cover animate-fade-in"
                data-testid="captured-preview"
              />
            ) : (
              // リアルタイムカメラストリーム
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="camera-stream"
              />
            )}
          </div>

          {/* ボタン操作領域 */}
          <div className="mt-8 flex flex-col gap-4 w-full max-w-md items-center">
            {!previewUrl && cameraPermissionState === 'granted' && (
              <button
                onClick={handleCapture}
                className="w-full h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center min-h-[44px]"
                data-testid="capture-btn"
              >
                撮影する
              </button>
            )}

            {previewUrl && (
              <div className="flex gap-4 w-full">
                <button
                  onClick={handleRetake}
                  disabled={isSubmitting}
                  className="flex-1 h-14 rounded-full border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-lg font-bold shadow-sm transition-all flex items-center justify-center min-h-[44px] disabled:opacity-50"
                  data-testid="retake-btn"
                >
                  撮り直す
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold shadow-md transition-all flex items-center justify-center min-h-[44px] disabled:bg-indigo-400"
                  data-testid="submit-btn"
                >
                  {isSubmitting ? '送信中...' : '送信する'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}