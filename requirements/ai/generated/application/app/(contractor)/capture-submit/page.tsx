"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserMeUseCase, UserMeResult } from "@/features/user/usecase/getUserMeUseCase";
import { useAttendanceStore } from "@/features/attendance/store/attendanceStore";
import { submitPunchUseCase } from "@/features/attendance/usecase/submitPunchUseCase";

// クライアント側画像圧縮処理 (SCR-005-FN-005, SCR-005-DT-002)
const compressImage = (fileBlob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(fileBlob);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      const maxSize = 1280;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context target is null"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas serialization failed"));
          }
        },
        "image/jpeg",
        0.7 // JPEG品質0.7に圧縮
      );
    };
    img.onerror = () => {
      reject(new Error("Image loading failed"));
    };
  });
};

export default function CaptureSubmitPage() {
  const router = useRouter();
  const store = useAttendanceStore();

  const [user, setUser] = useState<UserMeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'NOT_STARTED' | 'LOADING' | 'READY' | 'CAPTURED' | 'ERROR'>('NOT_STARTED');
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const userId = sessionStorage.getItem("user_id");
    const role = sessionStorage.getItem("role");

    // 未認証リダイレクト (SCR-005-VL-003)
    if (!userId || !role || role !== "CONTRACTOR_MANAGER") {
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("contractor_id");
      router.replace("/login");
      return;
    }

    const loadUserAndCamera = async () => {
      try {
        const result = await getUserMeUseCase(userId);
        if (result.success) {
          setUser(result.value);
          await startCamera();
        } else {
          setErrorMessage("error" in result ? result.error.message : "ユーザー情報の取得に失敗しました");
          setCameraState('ERROR');
        }
      } catch (err) {
        setErrorMessage("ユーザー情報の取得に失敗しました");
        setCameraState('ERROR');
      } finally {
        setLoading(false);
      }
    };

    loadUserAndCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [router]);

  // カメラ起動処理 (SCR-005-FN-001)
  const startCamera = async () => {
    setCameraState('LOADING');
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('ERROR');
      setErrorMessage("このブラウザはカメラの利用に対応していません。");
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: "user", // なりすまし防止のためのフロントカメラ推奨
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraState('READY');
    } catch (err) {
      setCameraState('ERROR');
      // カメラ権限エラー表示 (SCR-005-VL-002)
      setErrorMessage("カメラの利用権限を許可してください。");
    }
  };

  // 写真撮影処理 (SCR-005-FN-002, SCR-005-EV-001)
  const capturePhoto = async () => {
    if (!videoRef.current || !stream) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          const compressed = await compressImage(blob);
          setCapturedPhoto(compressed);
          const url = URL.createObjectURL(compressed);
          setPhotoUrl(url);
          setCameraState('CAPTURED');
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
          }
        } catch (err) {
          setErrorMessage("画像の圧縮処理に失敗しました。");
        }
      }
    }, "image/jpeg", 0.9);
  };

  // 撮り直し処理 (SCR-005-FN-003, SCR-005-EV-002)
  const retakePhoto = () => {
    if (photoUrl) {
      URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
    }
    setCapturedPhoto(null);
    startCamera();
  };

  // 戻るボタン押下時の挙動 (SCR-005-EV-005)
  const handleBack = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    router.push("/worker-select");
  };

  // 送信処理 (SCR-005-FN-004, SCR-005-EV-003, SCR-005-EV-004)
  const handleSubmit = async () => {
    if (!capturedPhoto || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const userId = sessionStorage.getItem("user_id") || "";
    const contractorId = sessionStorage.getItem("contractor_id") || "";

    try {
      const punchType = store.punchType || "CLOCK_IN";
      const count = store.selectedWorkerIds.length;

      const result = await submitPunchUseCase({
        workerIds: store.selectedWorkerIds,
        contractorId: contractorId,
        punchType: punchType,
        photo: capturedPhoto,
        punchedBy: userId,
        punchedAt: new Date().toISOString(),
      });

      if (result.success) {
        store.clear();
        // 完了情報をクエリパラメータとして引き渡して完了画面へ遷移 (SCR-006-DT-001)
        router.push(`/punch-complete?mode=${punchType}&count=${count}`);
      } else {
        const errorMsg = "error" in result ? result.error.message : "送信に失敗しました。時間をおいて再度お試しください。";
        setErrorMessage(errorMsg);
      }
    } catch (err) {
      setErrorMessage("送信処理中にエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && cameraState === 'NOT_STARTED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100" data-testid="loading-state">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none h-10 flex items-center justify-center min-w-[60px]"
            data-testid="back-button"
          >
            ← 戻る
          </button>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">証拠写真撮影</span>
            <span className="text-sm font-bold text-gray-800" data-testid="user-display-name">
              {user?.displayName} 様
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-lg space-y-6">
          {/* 打刻モード・対象作業員数表示 (SCR-005-UI-003) */}
          <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm" data-testid="punch-info-header">
            <div>
              <span className="text-xs text-gray-500 block">打刻モード</span>
              {store.punchType === "CLOCK_IN" ? (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800" data-testid="punch-mode-badge">
                  出勤
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800" data-testid="punch-mode-badge">
                  退勤
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 block">対象人数</span>
              <span className="text-base font-bold text-gray-800" data-testid="worker-count">
                {store.selectedWorkerIds.length} 名
              </span>
            </div>
          </div>

          {/* エラーメッセージ表示 (SCR-005-VL-002, SCR-005-EV-004) */}
          {errorMessage && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200 font-medium" role="alert" data-testid="error-message">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* カメラプレビュー領域 (SCR-005-UI-001) */}
          <div className="relative aspect-[4/3] w-full max-w-md mx-auto overflow-hidden rounded-lg bg-black shadow-inner flex items-center justify-center">
            {cameraState === 'LOADING' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white" data-testid="camera-loading">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-2"></div>
                  <p className="text-sm">カメラ起動中...</p>
                </div>
              </div>
            )}

            {cameraState === 'ERROR' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-red-400 p-4 text-center" data-testid="camera-error">
                <span className="text-3xl mb-2">📷</span>
                <p className="text-sm font-bold">カメラを起動できませんでした</p>
                <p className="text-xs text-gray-400 mt-1">ブラウザの設定でカメラへのアクセス権限を許可してください。</p>
                <button
                  onClick={startCamera}
                  className="mt-4 rounded bg-gray-700 px-4 py-2 text-xs font-bold text-white hover:bg-gray-600"
                >
                  再試行
                </button>
              </div>
            )}

            {(cameraState === 'READY' || cameraState === 'LOADING') && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraState === 'LOADING' ? 'hidden' : ''}`}
                data-testid="video-preview"
              />
            )}

            {cameraState === 'CAPTURED' && photoUrl && (
              <img
                src={photoUrl}
                alt="Captured Preview"
                className="w-full h-full object-cover"
                data-testid="photo-preview"
              />
            )}
          </div>

          {/* アクションボタン (SCR-005-UI-002, SCR-005-VL-001) */}
          <div className="flex flex-col gap-4">
            {cameraState === 'READY' && (
              <button
                onClick={capturePhoto}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-4 text-lg font-bold text-white shadow-md active:scale-95 hover:bg-blue-700 focus:outline-none h-14"
                data-testid="capture-button"
              >
                📸 写真を撮影する
              </button>
            )}

            {cameraState === 'CAPTURED' && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={retakePhoto}
                  disabled={isSubmitting}
                  className="flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-4 text-base font-bold text-gray-700 shadow-sm active:scale-95 hover:bg-gray-50 focus:outline-none h-14 disabled:opacity-50"
                  data-testid="retake-button"
                >
                  🔄 撮り直す
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-4 text-base font-bold text-white shadow-md active:scale-95 hover:bg-emerald-700 focus:outline-none h-14 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  data-testid="submit-button"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      送信中...
                    </span>
                  ) : (
                    "📤 送信する"
                  )}
                </button>
              </div>
            )}

            {cameraState === 'ERROR' && (
              <button
                onClick={handleBack}
                className="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-4 text-base font-bold text-gray-700 shadow-sm active:scale-95 hover:bg-gray-50 focus:outline-none h-14"
              >
                ← 戻って作業員を選び直す
              </button>
            )}
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="py-4 text-center text-xs text-gray-400">
        © 2026 勤怠・配置管理システム
      </footer>
    </div>
  );
}