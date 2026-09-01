"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '../../../lib/auth/session';
import { getAttendanceSession } from '../../../features/attendance/store/attendanceSession';
import { AttendanceRepository } from '../../../features/attendance/repository/attendanceRepository';
import { compressImage } from '../../../lib/utils/imageCompressor';
import { writeLog } from '../../../lib/logger/logger';

export default function CapturePage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [session, setSession] = useState<{
    userId: string;
    role: string;
    contractorId: string | null;
    displayName: string;
  } | null>(null);

  const [attendanceState, setAttendanceState] = useState<{
    punchMode: 'CLOCK_IN' | 'CLOCK_OUT';
    selectedWorkerIds: string[];
  } | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const activeSession = getSession();
    if (!activeSession || activeSession.role !== 'CONTRACTOR_MANAGER') {
      writeLog('WARN', 'UNAUTHORIZED_ACCESS_ATTEMPT', { role: activeSession?.role });
      router.push('/login');
      return;
    }
    setSession(activeSession);

    const activeAttendance = getAttendanceSession();
    if (!activeAttendance || activeAttendance.selectedWorkerIds.length === 0) {
      writeLog('WARN', 'MISSING_WORKER_SELECTIONS_REDIRECT');
      router.push('/contractor/workers');
      return;
    }
    setAttendanceState(activeAttendance);
  }, [router]);

  useEffect(() => {
    if (!session || !attendanceState) return;
    startCamera();

    return () => {
      stopCamera();
    };
  }, [session, attendanceState]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setCapturedBlob(null);
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NotSupported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      writeLog('INFO', 'CAMERA_INITIALIZATION_SUCCESS');
    } catch (err: any) {
      writeLog('ERROR', 'CAMERA_INITIALIZATION_FAILURE', { errorName: err.name, errorMessage: err.message });
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('カメラ利用権限がありません。ブラウザの設定からカメラのアクセスを許可してください。');
      } else {
        setCameraError('カメラを起動できませんでした。デバイスにカメラが搭載されているか確認してください。');
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !isCameraActive) return;

    try {
      writeLog('INFO', 'CAPTURING_FRAME');
      const blob = await compressImage(videoRef.current, 1280, 0.7);
      
      stopCamera();

      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setPhotoUrl(url);
      writeLog('INFO', 'IMAGE_COMPRESSION_SUCCESS', { size: blob.size, type: blob.type });
    } catch (err: any) {
      writeLog('ERROR', 'IMAGE_CAPTURE_FAILED', { message: err.message });
      triggerToast('error', '写真の撮影または圧縮に失敗しました。');
    }
  };

  const handleRetake = () => {
    writeLog('INFO', 'CAMERA_RETAKE_TRIGGERED');
    startCamera();
  };

  const handleSubmit = async () => {
    if (!capturedBlob || !session || !attendanceState) {
      writeLog('WARN', 'SUBMIT_ABORTED_INSUFFICIENT_DATA');
      return;
    }

    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const repo = new AttendanceRepository();
      let geo: { lat: number; lng: number } | undefined = undefined;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500 });
        });
        geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (e) {
        writeLog('INFO', 'GEOLOCATION_ACQUISITION_FAILED_OR_TIMEOUT');
      }

      const punchedAt = new Date().toISOString();
      const contractorId = session.contractorId || 'mock-contractor-id';

      const result = await repo.savePunch({
        workerIds: attendanceState.selectedWorkerIds,
        contractorId: contractorId,
        punchType: attendanceState.punchMode,
        photo: capturedBlob,
        punchedBy: session.userId,
        geo,
        punchedAt
      });

      if (result.success) {
        writeLog('INFO', 'ATTENDANCE_RECORD_SUBMIT_SUCCESS', { count: result.attendanceIds.length });
        triggerToast('success', '打刻データの送信に成功しました。');
        setTimeout(() => {
          router.push('/contractor/completed');
        }, 1200);
      } else {
        throw new Error('Failure status returned from mock save transaction');
      }
    } catch (err: any) {
      writeLog('ERROR', 'ATTENDANCE_SUBMIT_FATAL_ERROR', { message: err.message });
      triggerToast('error', '送信に失敗しました。容量不足などの可能性があります。時間をおいて再度お試しください。');
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    writeLog('INFO', 'CAPTURE_EXIT_TRIGGERED');
    stopCamera();
    router.push('/contractor/workers');
  };

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const handleSimulateCapture = () => {
    writeLog('INFO', 'SIMULATING_FALLBACK_CAPTURE');
    stopCamera();

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = attendanceState?.punchMode === 'CLOCK_IN' ? '#10B981' : '#EF4444';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`SIMULATED CAMERA STREAM - ${attendanceState?.punchMode}`, 30, 100);
      ctx.fillText(`Workers Selected Count: ${attendanceState?.selectedWorkerIds.length}`, 30, 150);
      ctx.fillText(new Date().toLocaleString(), 30, 200);
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setCapturedBlob(blob);
        setPhotoUrl(url);
      }
    }, 'image/jpeg', 0.7);
  };

  if (!session || !attendanceState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm font-medium">認証状態を確認しています...</p>
        </div>
      </div>
    );
  }

  const { punchMode, selectedWorkerIds } = attendanceState;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between selection:bg-indigo-200">
      {/* Toast Warning/Success Alerts */}
      {toastMessage && ( 
        <div 
          role="alert" 
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-xl shadow-2xl text-white font-semibold text-center max-w-sm transition-all duration-300 animate-bounce ${ 
            toastMessage.type === 'success' ? 'bg-emerald-600 border border-emerald-500' : 'bg-rose-600 border border-rose-500' 
          }`}
        > 
          {toastMessage.text} 
        </div> 
      )}

      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-2 min-h-[44px] min-w-[44px] transition-colors"
            aria-label="作業員選択へ戻る"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline font-bold">戻る</span>
          </button>

          <h1 className="text-md font-extrabold text-gray-800 tracking-wider">打刻写真撮影</h1>

          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg max-w-[140px] truncate font-medium">
            {session.displayName}
          </div>
        </div>
      </header>

      {/* Mode/Counts Sub-bar */}
      <section className="bg-indigo-900 text-white px-4 py-3.5 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-indigo-200 tracking-wide">打刻モード</span>
            <span className={`px-4 py-1 rounded-full text-xs font-black shadow-inner uppercase tracking-wider ${ 
              punchMode === 'CLOCK_IN' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white' 
            }`}>
              {punchMode === 'CLOCK_IN' ? '出勤' : '退勤'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-indigo-200 tracking-wide">対象者</span>
            <span className="bg-indigo-800 border border-indigo-700 text-white px-3 py-1 rounded-lg text-sm font-black">
              {selectedWorkerIds.length} 名
            </span>
          </div>
        </div>
      </section>

      {/* Main Area with Responsive Camera Stream Canvas */}
      <main className="flex-grow flex flex-col justify-center items-center px-4 py-6 w-full max-w-2xl mx-auto">
        <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-xl aspect-[4/3] relative flex items-center justify-center border-4 border-white">
          
          {/* Video Stream Mode */}
          {isCameraActive && !photoUrl && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                aria-label="ライブカメラストリーム"
              />
              <div className="absolute inset-0 border-4 border-indigo-500 border-dashed m-6 rounded-xl pointer-events-none flex items-center justify-center opacity-40">
                <p className="bg-slate-950 bg-opacity-70 text-white text-xs px-3 py-1.5 rounded-full font-bold tracking-widest">
                  枠内に本人の顔を写してください
                </p>
              </div>
            </>
          )}

          {/* Static Preview Mode */}
          {photoUrl && (
            <div className="w-full h-full relative">
              <img
                src={photoUrl}
                alt="送信対象プレビュー"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-emerald-600 border border-emerald-500 text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-md tracking-wider">
                送信対象イメージ
              </div>
            </div>
          )}

          {/* Permission or Access Block Warning */}
          {cameraError && (
            <div className="p-6 text-center text-white bg-slate-950 absolute inset-0 flex flex-col items-center justify-center">
              <div className="bg-rose-500 p-3 rounded-full mb-3 shadow-md">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-rose-400 mb-2">カメラ機能がブロックされています</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mb-6">
                {cameraError}
              </p>
              <button
                onClick={startCamera}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold py-3 px-6 rounded-xl shadow-md transition-colors min-h-[44px] min-w-[120px]"
              >
                アクセスを再試行
              </button>
            </div>
          )}

          {/* Stream startup loading spinner */}
          {!isCameraActive && !photoUrl && !cameraError && (
            <div className="text-center text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500 mx-auto mb-3"></div>
              <p className="text-xs font-semibold tracking-wide">カメラを準備しています...</p>
            </div>
          )}
        </div>

        {/* Sandbox Simulation fallback button */}
        {!isCameraActive && !photoUrl && (
          <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 w-full text-center">
            <p className="text-[11px] text-indigo-900 font-semibold mb-2">
              ※ テスト環境やカメラが無い端末では、シミュレーション用ダミー写真を利用できます。
            </p>
            <button
              onClick={handleSimulateCapture}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors min-h-[38px]"
            >
              カメラ撮影をシミュレート
            </button>
          </div>
        )}
      </main>

      {/* Adaptive Screen Action Bar */}
      <footer className="bg-white border-t border-gray-200 px-4 py-5 sticky bottom-0 z-40">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3">
          
          {/* Stream capturing state actions */}
          {isCameraActive && !photoUrl && (
            <>
              <button
                onClick={handleBack}
                className="flex-1 border border-gray-300 text-gray-700 bg-white font-bold rounded-xl py-3.5 px-6 hover:bg-gray-50 focus:ring-4 focus:ring-slate-100 transition-colors text-md flex items-center justify-center min-h-[52px]"
              >
                戻る
              </button>
              <button
                onClick={handleCapture}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl py-3.5 px-6 shadow-md hover:shadow-lg focus:ring-4 focus:ring-indigo-100 transition-all text-md flex items-center justify-center min-h-[52px]"
                aria-label="写真を撮影"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                撮影する
              </button>
            </> 
          )}

          {/* Photo confirm/submit action state */}
          {photoUrl && (
            <>
              <button
                disabled={isSubmitting}
                onClick={handleRetake}
                className="flex-1 border border-rose-200 text-rose-600 bg-rose-50 font-bold rounded-xl py-3.5 px-6 hover:bg-rose-100 focus:ring-4 focus:ring-rose-200 transition-colors text-md flex items-center justify-center disabled:opacity-50 min-h-[52px]"
              >
                撮り直す
              </button>
              <button
                disabled={isSubmitting || !capturedBlob}
                onClick={handleSubmit}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl py-3.5 px-6 shadow-md hover:shadow-lg focus:ring-4 focus:ring-emerald-200 transition-all text-md flex items-center justify-center disabled:opacity-50 min-h-[52px]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 h-5 mr-2 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    送信処理中...
                  </> 
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    打刻を送信する
                  </> 
                )}
              </button>
            </>
          )}

          {/* Error fallback buttons */}
          {!isCameraActive && !photoUrl && (
            <>
              <button
                onClick={handleBack}
                className="flex-1 border border-gray-300 text-gray-700 bg-white font-bold rounded-xl py-3.5 px-6 hover:bg-gray-50 transition-colors text-md flex items-center justify-center min-h-[52px]"
              >
                戻る
              </button>
              <button
                disabled={true}
                className="flex-1 bg-gray-200 text-gray-400 font-bold rounded-xl py-3.5 px-6 text-md flex items-center justify-center cursor-not-allowed min-h-[52px]"
              >
                送信（写真必須）
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
"
    },
    {