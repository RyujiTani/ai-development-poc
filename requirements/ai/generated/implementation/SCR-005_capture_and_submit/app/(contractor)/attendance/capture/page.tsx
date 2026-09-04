'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '../../../../lib/auth/session';
import { useAttendanceContext } from '../../../../features/attendance/store/attendanceStore';
import { logger } from '../../../../lib/logger/logger';
import { generateUUID } from '../../../../lib/db/indexedDB';
import { compressImage } from '../../../../lib/image/compressor';
import { IndexedDBAttendanceRepository } from '../../../../features/attendance/repository/attendanceRepository';

export default function CapturePage() {
  const router = useRouter();
  const { selectedWorkerIds, punchType } = useAttendanceContext();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // マウント時の認証確認 & リダイレクト処理
  useEffect(() => {
    setIsMounted(true);
    const userSession = getSession();
    if (!userSession || userSession.role !== 'CONTRACTOR_MANAGER') {
      logger.info('UNAUTHORIZED_REDIRECT', { reason: 'No valid contractor manager session' });
      router.push('/login');
      return;
    }
    setSession(userSession);
  }, [router]);

  // カメラストリームの起動
  const startCamera = async () => {
    try {
      setCameraError(null);
      setErrorToast(null);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      logger.error('CAMERA_PERMISSION_DENIED', err);
      setCameraError(
        'カメラのアクセス権限が必要です。ブラウザの設定でカメラ利用を許可してください。'
      );
    }
  };

  useEffect(() => {
    if (isMounted && session) {
      startCamera();
    }
    return () => {
      // クリーンアップ時にカメラストリームを完全に停止
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isMounted, session]);

  const stopCameraTracks = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // 写真キャプチャ
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setRawBlob(blob);
          stopCameraTracks();
          logger.info('PHOTO_CAPTURED_SUCCESSFULLY');
        }
      },
      'image/jpeg',
      0.95
    );
  };

  // 撮り直し
  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setRawBlob(null);
    setErrorToast(null);
    startCamera();
    logger.info('PHOTO_RETAKE_TRIGGERED');
  };

  // 戻るボタン
  const handleBack = () => {
    stopCameraTracks();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    logger.info('NAVIGATION_BACK_TO_WORKER_SELECT');
    router.push('/attendance/worker-select');
  };

  // 送信処理
  const handleSubmit = async () => {
    if (!rawBlob) {
      setErrorToast('写真が撮影されていません。');
      return;
    }
    if (selectedWorkerIds.length === 0) {
      setErrorToast('対象作業員が選択されていません。');
      return;
    }

    setIsSubmitting(true);
    setErrorToast(null);

    try {
      // クライアント側画像圧縮処理の適用 (3秒以内目標)
      const startTime = performance.now();
      const compressedBlob = await compressImage(rawBlob);
      const compressionDuration = performance.now() - startTime;

      logger.info('CLIENT_SIDE_IMAGE_COMPRESSION_COMPLETED', {
        durationMs: compressionDuration,
        originalSize: rawBlob.size,
        compressedSize: compressedBlob.size,
      });

      const photoObjectId = generateUUID();

      // 写真 Blob レコード
      const photoRecord = {
        photo_object_id: photoObjectId,
        blob: compressedBlob,
        content_type: 'image/jpeg',
        byte_size: compressedBlob.size,
        uploaded_by: session?.user_id || 'unknown',
        uploaded_at: new Date().toISOString(),
      };

      // 各対象作業員ごとの打刻実績
      const clockedAt = new Date().toISOString();
      const attendanceRecords = selectedWorkerIds.map((workerId) => ({
        attendance_id: generateUUID(),
        worker_id: workerId,
        contractor_id: session?.contractor_id || 'unknown',
        punch_type: punchType,
        clocked_at: clockedAt,
        punched_by: session?.user_id || 'unknown',
        photo_object_id: photoObjectId,
        created_at: clockedAt,
      }));

      // IndexedDBに書き込み
      const repo = new IndexedDBAttendanceRepository();
      await repo.savePhoto(photoRecord);
      await repo.saveAttendanceRecords(attendanceRecords);

      logger.info('ATTENDANCE_SUBMIT_SUCCESS', {
        workersCount: selectedWorkerIds.length,
        punchType,
      });

      // 完了画面へ
      router.push('/attendance/complete');
    } catch (error) {
      logger.error('ATTENDANCE_SUBMIT_FAILED', error);
      setErrorToast('データの送信に失敗しました。IndexedDBの空き容量などを確認して再試行してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted || !session) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4"></div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-12 flex flex-col items-center">
      {/* 画面ヘッダー */}
      <div className="w-full max-w-md bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button
          onClick={handleBack}
          className="h-10 px-3 flex items-center gap-1 text-slate-600 hover:text-slate-800 focus:outline-none rounded-md"
          aria-label="戻る"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>戻る</span>
        </button>
        <h1 className="text-base font-bold text-slate-800">
          {punchType === 'CLOCK_IN' ? '出勤打刻' : '退勤打刻'}
        </h1>
        <div className="w-12"></div>
      </div>

      {/* ステータスバー */}
      <div className="w-full max-w-md bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-center">
        <span className="text-sm font-semibold text-indigo-700">
          {punchType === 'CLOCK_IN' ? '【出勤】' : '【退勤】'} 対象作業員: {selectedWorkerIds.length}名
        </span>
      </div>

      <div className="w-full max-w-md flex-1 p-4 flex flex-col justify-between gap-6">
        {/* カメラプレビューおよび静止画プレビュー領域 */}
        <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border border-slate-200">
          {!previewUrl && !cameraError && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
              style={{ display: 'block' }}
            />
          )}

          {previewUrl && (
            <img
              src={previewUrl}
              alt="プレビュー"
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white">
              <svg
                className="w-12 h-12 text-rose-400 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-sm font-medium leading-relaxed">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs"
              >
                カメラを再試行
              </button>
            </div>
          )}

          {/* 右上インジケータ */}
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider text-white uppercase">
            {previewUrl ? 'Preview' : 'Live Camera'}
          </div>
        </div>

        {/* トースト・警告メッセージ */}
        {errorToast && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium p-3.5 rounded-xl shadow-sm animate-pulse">
            {errorToast}
          </div>
        )}

        {/* コントロールボタン群 (屋外での操作を考慮した48px以上の大きいボタン) */}
        <div className="flex flex-col gap-3.5">
          {!previewUrl ? (
            <button
              onClick={handleCapture}
              disabled={!!cameraError}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-lg font-bold rounded-2xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              aria-label="写真を撮影する"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>写真を撮影する</span>
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleRetake}
                disabled={isSubmitting}
                className="flex-1 h-14 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 text-base font-bold rounded-2xl transition-all"
                aria-label="撮り直す"
              >
                撮り直す
              </button>

              <button
                onClick={handleSubmit}
                disabled={!previewUrl || isSubmitting}
                className="flex-[2] h-14 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-lg font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                aria-label="打刻を送信する"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>送信中...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                    <span>打刻を送信する</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </main>
  );
}