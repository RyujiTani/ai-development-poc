"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAttendanceStore } from "@/features/attendance/store/useAttendanceStore";
import { saveAttendanceAndPhoto } from "@/features/attendance/repository/attendanceRepository";
import { compressImage } from "@/features/attendance/utils/imageCompressor";

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const CameraIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function CapturePage() {
  const router = useRouter();
  const { punchMode, selectedWorkerIds } = useAttendanceStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    function checkAuth() {
      if (typeof sessionStorage === "undefined") {
        setIsLoading(false);
        return;
      }

      const storedId = sessionStorage.getItem("user_id");
      const storedRole = sessionStorage.getItem("role");

      // 未認証状態でのリダイレクトガード
      if (!storedId || storedRole !== "CONTRACTOR_MANAGER") {
        router.push("/login");
        return;
      }

      // 必要な引き継ぎコンテキストが不足している場合も戻す
      if (selectedWorkerIds.length === 0 || !punchMode) {
        router.push("/worker-select");
        return;
      }

      setIsLoading(false);
    }

    checkAuth();
  }, [router, selectedWorkerIds, punchMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Failed to initialize camera:", err);
      setCameraError("カメラの起動に失敗しました。設定でカメラのアクセス権限を確認してください。");
    }
  };

  useEffect(() => {
    if (!isLoading) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isLoading]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 撮影完了後はカメラ配信ストリームを一時停止してリソース解放
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    // クライアント側でアスペクト比維持しつつ上限1280px / JPEG 0.7で圧縮
    const compressed = await compressImage(canvas);
    setCapturedBlob(compressed);

    const url = URL.createObjectURL(compressed);
    setPreviewUrl(url);
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCapturedBlob(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!capturedBlob || selectedWorkerIds.length === 0 || !punchMode) return;
    setIsSubmitting(true);
    setToast(null);

    try {
      const storedId = sessionStorage.getItem("user_id") || "";
      const storedContractorId = sessionStorage.getItem("contractor_id") || "";

      await saveAttendanceAndPhoto(
        selectedWorkerIds,
        storedContractorId,
        punchMode,
        capturedBlob,
        storedId
      );

      // 保存成功時に打刻完了画面へ遷移 (クエリパラメータに送信成功情報を乗せて引き継ぐ)
      router.push(`/punch-complete?mode=${punchMode}&count=${selectedWorkerIds.length}`);
    } catch (error) {
      console.error("Submission error:", error);
      setToast({
        type: "error",
        text: "打刻データの送信に失敗しました。時間をおいて再度お試しください。"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push("/worker-select");
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div className="flex items-center space-x-2 text-slate-600">
          <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="font-semibold text-lg">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen relative">
      {/* 簡易通知トーストUI */}
      {toast && (
        <div
          data-testid="toast-message"
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3.5 rounded-xl shadow-lg text-white text-base font-bold transition-all duration-300 max-w-sm text-center ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* 送信ローディング画面 */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex flex-col items-center justify-center text-white" data-testid="global-loading">
          <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xl font-bold">打刻情報を送信中...</span>
          <span className="text-sm text-slate-300 mt-2">ブラウザの操作を完了するまでそのままでお待ちください。</span>
        </div>
      )}

      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={isSubmitting}
            className="flex items-center space-x-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            style={{ minHeight: "44px" }}
            aria-label="戻る"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>戻る</span>
          </button>
          <h1 className="text-lg font-bold text-slate-900">
            写真撮影
          </h1>
          <div className="w-[76px]" />
        </div>
      </header>

      {/* メインレイアウト */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col justify-start">
        {/* 打刻概要ヘッダー */}
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-blue-800 tracking-wider uppercase">打刻モード | 対象人数</span>
            <span className="text-base font-bold text-slate-900 mt-0.5" data-testid="summary-header">
              {punchMode === "CLOCK_IN" ? "出勤" : "退勤"}モード | 対象作業員: {selectedWorkerIds.length}名
            </span>
          </div>
          <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-extrabold shadow-sm">
            本人撮影
          </span>
        </div>

        {/* プレビュー・カメラ領域 */}
        <div className="bg-slate-900 border border-slate-200 rounded-2xl overflow-hidden aspect-video relative flex justify-center items-center shadow-md">
          {cameraError ? (
            <div className="p-8 text-center text-red-400 font-bold" data-testid="camera-error">
              {cameraError}
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="撮影プレビュー"
              className="w-full h-full object-cover"
              data-testid="preview-image"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
              data-testid="camera-video"
            />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* ボタン操作部：屋外作業員向けに44px以上の十分な大きさ */}
        <div className="mt-8 space-y-4">
          {!previewUrl ? (
            <button
              onClick={handleCapture}
              disabled={!!cameraError || isSubmitting}
              className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-bold shadow hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
              style={{ minHeight: "56px" }}
              data-testid="capture-btn"
            >
              <CameraIcon className="h-6 w-6" />
              <span>写真を撮影する</span>
            </button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleRetake}
                disabled={isSubmitting}
                className="w-full border-2 border-slate-300 bg-white text-slate-800 rounded-xl py-4 text-base font-bold shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                style={{ minHeight: "56px" }}
                data-testid="retake-btn"
              >
                <RefreshIcon className="h-5 w-5" />
                <span>撮り直す</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white rounded-xl py-4 text-base font-bold shadow hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2 disabled:bg-emerald-400 disabled:cursor-not-allowed"
                style={{ minHeight: "56px" }}
                data-testid="submit-btn"
              >
                <CheckIcon className="h-5 w-5" />
                <span>打刻データを送信する</span>
              </button>
            </div>
          )}

          {!previewUrl && (
            <button
              disabled
              className="w-full bg-slate-200 text-slate-400 rounded-xl py-4 text-base font-bold cursor-not-allowed flex items-center justify-center space-x-2"
              style={{ minHeight: "56px" }}
              data-testid="submit-btn"
            >
              <CheckIcon className="h-5 w-5" />
              <span>撮影後に送信できます</span>
            </button>
          )}
        </div>
      </main>
    </div>
  );
}