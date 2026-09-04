'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isAuthenticated } from '../../../../lib/auth/mockAuth';
import { logger } from '../../../../lib/logger/logger';
import { IndexedDBAttendanceRepository } from '../../../../features/attendance/repository/attendanceRepository';
import { PunchUseCase, PunchInput } from '../../../../features/attendance/usecase/punchUseCase';
import { PunchType } from '../../../../features/attendance/domain/types';

type CameraStatus = 'IDLE' | 'STREAMING' | 'CAPTURED' | 'ERROR';

interface PunchDraft {
  selectedWorkerIds: string[];
  punchType: PunchType;
  workerCount: number;
}

const DRAFT_STORAGE_KEY = 'worker_attendance_punch_draft';

export default function PunchCapturePage() {
  const router = useRouter();

  // State
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [draft, setDraft] = useState<PunchDraft | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // 1. 認証チェック
  useEffect(() => {
    if (!isAuthenticated('CONTRACTOR_MANAGER')) {
      logger.warn('Unauthenticated access attempt to capture screen');
      router.replace('/login');
    }
  }, [router]);

  // 2. ドラフト（前画面 SCR-004 で選択した情報）の読み込み
  useEffect(() => {
    const rawDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      logger.warn('No punch draft found in sessionStorage. Redirecting to worker select screen.');
      showToast('作業員が選択されていません。作業員選択画面へ戻ります。');
      setTimeout(() => {
        router.push('/punch/worker-select');
      }, 2000);
      return;
    }

    try {
      const parsedDraft = JSON.parse(rawDraft) as PunchDraft;
      if (!parsedDraft.selectedWorkerIds || parsedDraft.selectedWorkerIds.length === 0) {
        throw new Error('作業員の選択件数が0件です');
      }
      setDraft(parsedDraft);
    } catch (err) {
      logger.error('Failed to parse punch draft', err);
      showToast('打刻データの読み込みに失敗しました。再度選択してください。');
      setTimeout(() => {
        router.push('/punch/worker-select');
      }, 2000);
    }
  }, [router, showToast]);

  // 3. カメラストリーム起動
  const startCamera = useCallback(async () => {
    setErrorMessage('');
    setCameraStatus('IDLE');

    // 既存ストリームがあれば破棄
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // 外向きカメラを優先
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((err) => {
            logger.error('Failed to play video', err);
          });
        };
      }

      setCameraStatus('STREAMING');
      logger.info('Camera started successfully');
    } catch (err: any) {
      logger.error('Failed to access camera', err);
      let errMsg = 'カメラへのアクセスが拒否されました。設定より権限を許可してください。';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'カメラ端末が見つかりません。カメラデバイスを接続してください。';
      }
      setErrorMessage(errMsg);
      setCameraStatus('ERROR');
      showToast(errMsg);
    }
  }, [showToast]);

  // 起動時の初期化
  useEffect(() => {
    // 認証済＆ドラフトが読み込まれている時のみ起動
    if (isAuthenticated('CONTRACTOR_MANAGER')) {
      startCamera();
    }

    return () => {
      // クリーンアップ
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // 4. 撮影アクション (Capture)
  const handleCapture = () => {
    if (!videoRef.current || cameraStatus !== 'STREAMING') return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;

    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logger.error('Failed to get 2D canvas context');
      showToast('撮影処理に失敗しました。');
      return;
    }

    // 左右反転対応（インカメラ撮影時などの鏡像調整。通常のアウトカメラならそのまま描画）
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

    try {
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImageUri(dataUrl);
      setCameraStatus('CAPTURED');

      // プレビュー表示のためにビデオを一時停止、ストリーム自体は停止
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      logger.info('Photo captured and stream stopped');
    } catch (err) {
      logger.error('Failed to export canvas image', err);
      showToast('写真のプレビュー生成に失敗しました。');
    }
  };

  // 5. 撮り直しアクション (Retake)
  const handleRetake = () => {
    if (capturedImageUri) {
      setCapturedImageUri(null);
    }
    logger.info('User triggered retake');
    startCamera();
  };

  // 6. 画像のクライアントサイド圧縮
  const compressImage = async (dataUri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = dataUri;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSide = 1280;

        // アスペクト比維持で長辺最大1280pxにリサイズ
        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be created'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Quality: 0.7 JPEG圧縮
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob conversion returned null'));
            }
          },
          'image/jpeg',
          0.7
        );
      };
      img.onerror = (err) => {
        reject(err);
      };
    });
  };

  // 7. 位置情報の取得 (ブラウザ API)
  const getGeoLocation = (): Promise<{ lat: number; lng: number } | undefined> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          logger.warn('Failed to retrieve geolocation', { error_code: error.code });
          resolve(undefined); // 位置情報取得失敗でも処理自体は続行
        },
        { timeout: 5000 }
      );
    });
  };

  // 8. 打刻送信処理 (Submit)
  const handleSubmit = async () => {
    if (!capturedImageUri || !draft) return;

    setIsSubmitting(true);
    logger.info('Submitting punch details', {
      workers_count: draft.selectedWorkerIds.length,
      punch_type: draft.punchType,
    });

    try {
      const session = getSession();
      if (!session || !session.contractorId) {
        throw new Error('外注先企業セッション情報が無効です。再度ログインしてください。');
      }

      // クライアント側画像圧縮
      const compressedBlob = await compressImage(capturedImageUri);

      // 位置情報
      const geo = await getGeoLocation();

      // IndexedDB打刻処理の実行
      const attendanceRepo = new IndexedDBAttendanceRepository();
      const usecase = new PunchUseCase(attendanceRepo);

      const input: PunchInput = {
        workerIds: draft.selectedWorkerIds,
        contractorId: session.contractorId,
        punchType: draft.punchType,
        photoBlob: compressedBlob,
        punchedBy: session.userId,
        geo,
      };

      const result = await usecase.execute(input);

      if (result.success) {
        logger.info('Punch submission complete, redirecting', {
          attendance_ids_count: result.attendanceIds.length,
        });

        // 送信が成功したらドラフトをクリアして完了画面へ遷移
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        router.push('/punch/complete');
      } else {
        throw new Error('打刻処理が異常終了しました。');
      }
    } catch (err: any) {
      logger.error('Punch submission failed', err);
      showToast(err.message || '送信に失敗しました。電波状況をご確認の上、再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. 戻るボタン
  const handleBack = () => {
    logger.info('User triggered back navigation to worker select');
    router.push('/punch/worker-select');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-between p-4 font-sans text-slate-800">
      {/* 画面上部：ヘッダー＆選択情報表示 */}
      <header className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 mt-2">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center text-slate-600 hover:text-slate-900 font-medium py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
            style={{ minHeight: '48px', minWidth: '80px' }}
          >
            ← 戻る
          </button>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-bold tracking-wider block uppercase">
              打刻モード
            </span>
            <span
              className={`text-lg font-extrabold px-2 py-0.5 rounded ${
                draft?.punchType === 'CLOCK_IN'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {draft?.punchType === 'CLOCK_IN' ? '出勤' : '退勤'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
          <p className="text-sm text-slate-600 font-medium">対象作業員</p>
          <p className="text-xl font-black text-slate-900">
            {draft?.workerCount ?? 0} <span className="text-sm font-semibold text-slate-500">名</span>
          </p>
        </div>
      </header>

      {/* 画面中部：カメラプレビュー / 静止画プレビュー領域 */}
      <main className="w-full max-w-md flex-1 flex flex-col items-center justify-center my-4 relative">
        <div className="w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 relative flex items-center justify-center">
          {/* 1. カメラ起動中（STREAMING） */}
          {cameraStatus === 'STREAMING' && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              aria-label="カメラ映像プレビュー"
            />
          )}

          {/* 2. 写真撮影済（CAPTURED） */}
          {cameraStatus === 'CAPTURED' && capturedImageUri && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedImageUri}
              alt="撮影写真"
              className="w-full h-full object-cover"
              aria-label="撮影された写真のプレビュー"
            />
          )}

          {/* 3. エラー発生時（ERROR） */}
          {cameraStatus === 'ERROR' && (
            <div className="p-6 text-center text-white flex flex-col items-center justify-center gap-4">
              <span className="text-4xl">⚠️</span>
              <p className="text-sm font-medium leading-relaxed max-w-xs">{errorMessage}</p>
              <button
                onClick={startCamera}
                className="mt-2 bg-white/20 hover:bg-white/30 text-white font-bold py-2.5 px-6 rounded-full border border-white/40 transition-colors"
                style={{ minHeight: '48px' }}
              >
                カメラを再起動する
              </button>
            </div>
          )}

          {/* 4. 初期状態/読み込み中 */}
          {cameraStatus === 'IDLE' && (
            <div className="text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-3"></div>
              <p className="text-sm">カメラを起動しています...</p>
            </div>
          )}
        </div>
      </main>

      {/* 画面下部：コントロールボタン群 */}
      <footer className="w-full max-w-md bg-white rounded-2xl shadow-md border border-slate-200/80 p-5 mb-2">
        {cameraStatus === 'STREAMING' && (
          <button
            onClick={handleCapture}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-lg py-4 px-6 rounded-xl shadow-md shadow-blue-200 hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
            style={{ minHeight: '56px' }}
          >
            📸 写真を撮影する
          </button>
        )}

        {cameraStatus === 'CAPTURED' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full text-white font-extrabold text-lg py-4 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-200'
              }`}
              style={{ minHeight: '56px' }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  送信中...
                </>
              ) : (
                <>✨ 打刻データを送信する</>
              )}
            </button>

            <button
              onClick={handleRetake}
              disabled={isSubmitting}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base py-3 px-6 rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2"
              style={{ minHeight: '52px' }}
            >
              🔄 撮り直す
            </button>
          </div>
        )}

        {cameraStatus === 'ERROR' && (
          <button
            onClick={handleBack}
            className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-lg py-4 px-6 rounded-xl transition-colors"
            style={{ minHeight: '56px' }}
          >
            作業員選択へ戻る
          </button>
        )}
      </footer>

      {/* 簡易トースト */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900/95 text-white text-sm font-semibold py-3 px-6 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 max-w-sm animate-bounce text-center">
          <span>ℹ️</span> {toastMessage}
        </div>
      )}
    </div>
  );
}