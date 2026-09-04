'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager, Session } from '../../../../lib/auth/session';
import { useToast } from '../../../../components/ui/toast';
import { logger } from '../../../../lib/logger/logger';
import { useAttendanceStore } from '../../../../features/attendance/store/useAttendanceStore';
import { Button } from '../../../../components/ui/button';
import { compressImage } from '../../../../lib/image/compress';
import { IndexedDBAttendanceRepository } from '../../../../features/attendance/repository/attendanceRepository';
import { CreateAttendanceUseCase } from '../../../../features/attendance/usecase/createAttendanceUseCase';

export default function PunchCapturePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const { punchType, selectedWorkerIds, clearAttendanceSession, setLastPunchSummary } = useAttendanceStore();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 認証チェック
  useEffect(() => {
    const currentSession = sessionManager.getSession();
    if (!currentSession || currentSession.role !== 'CONTRACTOR_MANAGER') {
      logger.warn('unauthorized_access_redirect', {
        role: currentSession?.role,
      });
      sessionManager.clearSession();
      router.push('/login');
      return;
    }

    if (!punchType || selectedWorkerIds.length === 0) {
      showToast('打刻モードと対象作業員を先に選択してください。', 'error');
      router.push('/contractor/punch-mode');
      return;
    }

    setSession(currentSession);
    setLoading(false);
    logger.info('punch_photo_loaded', { user_id: currentSession.user_id });
  }, [router, punchType, selectedWorkerIds, showToast]);

  // カメラ起動処理
  const startCamera = async () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setCameraPermission('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      logger.error('failed_to_start_camera', err);
      setCameraPermission('denied');
      showToast('カメラへのアクセスが拒否されました。設定を確認してください。', 'error');
    }
  };

  useEffect(() => {
    if (!loading && !photoBlob) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [loading, photoBlob]);

  // 写真表示用 Object URL の管理
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // シャッターを切る
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // 自撮り用反転（ミラー効果）を戻す
    context.translate(canvas.width, 0);
    context.scale(-1, 1);

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPhotoBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);

          // カメラストリームの停止
          stream.getTracks().forEach((track) => track.stop());
          setStream(null);
          logger.info('photo_captured_successfully', { byte_size: blob.size });
        }
      },
      'image/jpeg',
      0.9
    );
  };

  // 撮り直し
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPhotoBlob(null);
    startCamera();
    logger.info('photo_retake_initiated');
  };

  // 打刻データの送信
  const handleSubmit = async () => {
    if (!photoBlob || !session || submitting) return;

    setSubmitting(true);
    try {
      logger.info('attendance_submission_start');

      // クライアント側での画像圧縮 (最大長辺1280px / JPEG 0.7)
      const compressedBlob = await compressImage(photoBlob, 1280, 0.7);
      
      // 画像容量が 1MB 以下であるかダブルチェック
      if (compressedBlob.size > 1024 * 1024) {
        logger.warn('compressed_image_exceeds_1mb', { size: compressedBlob.size });
      }

      const repository = new IndexedDBAttendanceRepository();
      const useCase = new CreateAttendanceUseCase(repository);

      const result = await useCase.execute({
        workerIds: selectedWorkerIds,
        contractorId: session.contractor_id || '',
        punchType: punchType as 'CLOCK_IN' | 'CLOCK_OUT',
        photo: compressedBlob,
        punchedBy: session.user_id,
      });

      if (result.success) {
        showToast('打刻を記録しました。', 'success');
        if (punchType) {
          setLastPunchSummary({
            punchType,
            workerCount: selectedWorkerIds.length,
          });
        }
        clearAttendanceSession();
        router.push('/contractor/punch-complete');
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (err) {
      logger.error('attendance_submission_failed', err);
      showToast('打刻の送信に失敗しました。', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    logger.info('navigate_back_from_photo_capture');
    router.push('/contractor/worker-select');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-500 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              disabled={submitting}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition h-10 w-10 flex items-center justify-center cursor-pointer"
              aria-label="戻る"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider">勤怠・配置管理</span>
              <span className="text-sm font-bold text-gray-900 sm:text-base">証拠写真撮影</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-800">{session?.display_name} 様</p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col justify-between">
        {/* ステータスサマリー */}
        <div className="mb-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-bold">打刻種別:</span>
            {punchType === 'CLOCK_IN' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                出勤
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
                退勤
              </span>
            )}
          </div>
          <div>
            <span className="text-xs text-gray-500 font-bold">対象人数:</span>
            <span className="ml-1.5 text-base font-extrabold text-indigo-600">{selectedWorkerIds.length}</span>
            <span className="text-xs text-gray-500 font-bold"> 名</span>
          </div>
        </div>

        {/* プレビュー / カメラ起動領域 */}
        <div className="flex-1 bg-black rounded-3xl overflow-hidden relative min-h-[320px] sm:min-h-[420px] flex items-center justify-center shadow-inner border border-gray-800">
          {cameraPermission === 'denied' ? (
            <div className="text-center p-6 text-white max-w-sm">
              <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="font-bold text-base mb-2">カメラの利用権限が必要です</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                写真撮影による本人の確認を行います。ブラウザの設定等でカメラへのアクセスを許可してください。
              </p>
              <button
                onClick={startCamera}
                className="mt-4 px-5 h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                カメラを再読み込みする
              </button>
            </div>
          ) : previewUrl ? (
            <div className="w-full h-full flex items-center justify-center relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="撮影写真プレビュー"
                className="max-w-full max-h-full object-contain"
              />
              <span className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur text-white text-xs font-semibold rounded-full border border-white/20">
                撮影プレビュー表示中
              </span>
            </div>
          ) : (
            <div className="w-full h-full relative flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 border-2 border-white/20 pointer-events-none rounded-3xl m-4 flex items-center justify-center">
                {/* 撮影用のガイド円 */}
                <div className="w-52 h-52 border-2 border-dashed border-white/40 rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* 操作ボタン */}
        <div className="mt-6 space-y-4">
          {previewUrl ? (
            <div className="grid grid-cols-2 gap-4">
              <button
                id="retake-button"
                onClick={handleRetake}
                disabled={submitting}
                className="px-6 h-14 rounded-xl text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 font-bold transition flex items-center justify-center gap-2 cursor-pointer text-base disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                </svg>
                撮り直し
              </button>
              <Button
                id="submit-button"
                onClick={handleSubmit}
                loading={submitting}
                disabled={submitting}
                className="h-14 rounded-xl text-base font-bold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-lg hover:shadow-xl transition flex items-center justify-center"
              >
                これで送信する
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                id="capture-button"
                onClick={handleCapture}
                disabled={cameraPermission !== 'granted' || submitting}
                className="w-full h-16 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer text-lg disabled:opacity-50 disabled:bg-gray-400"
              >
                <span className="w-4 h-4 bg-white rounded-full animate-pulse" />
                撮影する
              </button>
              <button
                onClick={handleBack}
                disabled={submitting}
                className="w-full px-6 h-12 rounded-xl text-gray-600 hover:text-gray-900 border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 font-semibold transition flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                戻る
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 非表示のCanvas（キャプチャ用） */}
      <canvas ref={canvasRef} className="hidden" />

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-400">
          &copy; 2026 勤怠・配置管理システム プロトタイプ版
        </div>
      </footer>
    </div>
  );
}