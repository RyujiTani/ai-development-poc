'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Worker, AttendanceRecord, PunchType } from '@/features/attendance/domain/types';
import { IAttendanceRepository } from '@/features/attendance/repository/attendanceRepository';
import { AuthSession } from '@/lib/auth/authStore';

interface PunchCorrectionFormProps {
  repository: IAttendanceRepository;
  session: AuthSession;
  initialAttendanceId?: string | null;
}

export default function PunchCorrectionForm({
  repository,
  session,
  initialAttendanceId,
}: PunchCorrectionFormProps) {
  const router = useRouter();

  // フォームステート
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [punchType, setPunchType] = useState<PunchType>('CLOCK_IN');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // 既存打刻履歴＆選択用
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // UI状態
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. 初期データロード
  useEffect(() => {
    async function loadInitialData() {
      if (!session.contractorId) return;
      setIsLoading(true);
      try {
        // 自社所属の作業員マスタを取得
        const activeWorkers = await repository.getWorkersByContractor(session.contractorId);
        setWorkers(activeWorkers);

        // クエリパラメータで直接既存打刻IDが指定された場合
        if (initialAttendanceId) {
          const record = await repository.getAttendanceRecord(initialAttendanceId);
          if (record && record.contractor_id === session.contractorId) {
            setSelectedWorkerId(record.worker_id);
            setSelectedRecordId(record.attendance_id);
            setPunchType(record.punch_type);
            setIsEditMode(true);

            // 日時をパースしてフォームにセット
            const d = new Date(record.clocked_at);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');

            setDate(`${yyyy}-${mm}-${dd}`);
            setTime(`${hh}:${min}`);
          } else {
            showToast('指定された打刻実績が見つかりません、またはアクセス権がありません。', 'error');
          }
        } else {
          // 新規登録デフォルト値として本日の日付をセット
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          setDate(`${yyyy}-${mm}-${dd}`);
        }
      } catch (err) {
        showToast('データのロードに失敗しました。', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [session.contractorId, initialAttendanceId, repository]);

  // 2. 作業員が選択されたら、最近の打刻履歴を取得する
  useEffect(() => {
    if (!selectedWorkerId || initialAttendanceId) {
      setRecentRecords([]);
      return;
    }

    async function loadWorkerHistory() {
      try {
        const history = await repository.getAttendanceRecordsByWorker(selectedWorkerId);
        setRecentRecords(history.slice(0, 5)); // 直近5件を表示
      } catch (err) {
        showToast('履歴の読み込みに失敗しました。', 'error');
      }
    }
    loadWorkerHistory();
  }, [selectedWorkerId, initialAttendanceId, repository]);

  // トースト表示ヘルパー
  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 履歴リストから打刻を選択して編集モードへ切り替え
  const handleSelectRecordForEdit = (record: AttendanceRecord) => {
    setSelectedRecordId(record.attendance_id);
    setPunchType(record.punch_type);
    setIsEditMode(true);

    const d = new Date(record.clocked_at);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');

    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:${min}`);
    setErrors({});
  };

  // 新規登録モードにリセットする
  const handleResetToNew = () => {
    setSelectedRecordId('');
    setIsEditMode(false);
    setPunchType('CLOCK_IN');
    const today = new Date();
    setDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    setTime('');
    setErrors({});
  };

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedWorkerId) {
      newErrors.worker = '作業員を選択してください。';
    }
    if (!date || !time) {
      newErrors.datetime = '有効な日時を入力してください。';
    } else {
      const parsedDate = new Date(`${date}T${time}`);
      if (isNaN(parsedDate.getTime())) {
        newErrors.datetime = '有効な日時を入力してください。';
      }
    }
    if (!punchType) {
      newErrors.punchType = '打刻種別を選択してください。';
    }
    if (!reason || reason.trim() === '') {
      newErrors.reason = '修正理由を入力してください。';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('入力内容に不備があります。確認してください。', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const clockedAtISO = new Date(`${date}T${time}`).toISOString();
      const nowISO = new Date().toISOString();

      let originalRecord: AttendanceRecord | null = null;
      if (isEditMode && selectedRecordId) {
        originalRecord = await repository.getAttendanceRecord(selectedRecordId);
      }

      // 1. 新しい（または更新後の）打刻実績オブジェクトを構築
      const targetAttendanceId = isEditMode && selectedRecordId ? selectedRecordId : `att-${crypto.randomUUID()}`;
      const updatedRecord: AttendanceRecord = {
        attendance_id: targetAttendanceId,
        worker_id: selectedWorkerId,
        contractor_id: session.contractorId!,
        punch_type: punchType,
        clocked_at: clockedAtISO,
        punched_by: session.userId,
        created_at: originalRecord ? originalRecord.created_at : nowISO,
      };

      // 2. 打刻修正履歴 (attendance_corrections) オブジェクトを構築
      const correction: AttendanceCorrection = {
        correction_id: `corr-${crypto.randomUUID()}`,
        attendance_id: targetAttendanceId,
        corrected_by: session.userId,
        reason: reason.trim(),
        before: originalRecord ? {
          punch_type: originalRecord.punch_type,
          clocked_at: originalRecord.clocked_at,
        } : undefined,
        after: {
          punch_type: punchType,
          clocked_at: clockedAtISO,
        },
        corrected_at: nowISO,
      };

      // 3. IndexedDB へ保存
      await repository.saveAttendanceRecord(updatedRecord);
      await repository.saveAttendanceCorrection(correction);

      // 監査ログ出力（シミュレーション）
      console.log('AUDIT LOG:', {
        level: 'info',
        event: 'CORRECT_PUNCH',
        payload: {
          actor_user_id: session.userId,
          target_attendance_id: targetAttendanceId,
          is_edit: isEditMode,
        }
      });

      showToast(isEditMode ? '打刻修正を登録しました。' : '手動打刻を登録しました。', 'success');

      // 完了トースト読了後に遷移（体感速度と確認しやすさを両立）
      setTimeout(() => {
        router.push('/contractor/home');
      }, 1500);

    } catch (err) {
      showToast('保存処理中にエラーが発生しました。', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // キャンセルは確認なしで即ホーム画面へ遷移
    router.push('/contractor/home');
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
      {/* 画面内トースト通知 */}
      {toastMessage && (
        <div
          data-testid="toast-notification"
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-md shadow-lg text-white font-bold transition-all duration-300 ${
            toastMessage.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6">
        <h1 className="text-xl md:text-2xl font-bold">外注先打刻修正画面</h1>
        <p className="text-sm opacity-90 mt-1">
          所属企業: {session.displayName}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {isLoading ? (
          <div className="py-12 flex justify-center items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-700"></div>
            <span className="ml-3 text-gray-600">データを読み込み中...</span>
          </div>
        ) : (
          <>
            {/* モード表示バッジ */}
            <div className="flex justify-between items-center">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  isEditMode ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                }`}
              >
                {isEditMode ? '● 既存打刻の修正モード' : '● 新規手動打刻登録モード'}
              </span>
              {isEditMode && !initialAttendanceId && (
                <button
                  type="button"
                  onClick={handleResetToNew}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline focus:outline-none"
                >
                  新規手動登録に戻す
                </button>
              )}
            </div>

            {/* 1. 作業員選択 */}
            <div>
              <label htmlFor="worker-select" className="block text-sm font-medium text-gray-700 mb-1">
                対象作業員 <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                id="worker-select"
                value={selectedWorkerId}
                onChange={(e) => {
                  setSelectedWorkerId(e.target.value);
                  handleResetToNew();
                }}
                disabled={!!initialAttendanceId}
                className={`w-full min-h-[44px] px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white ${
                  errors.worker ? 'border-red-500 bg-red-50' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              >
                <option value="">-- 作業員を選択してください --</option>
                {workers.map((worker) => (
                  <option key={worker.worker_id} value={worker.worker_id}>
                    {worker.name}
                  </option>
                ))}
              </select>
              {errors.worker && (
                <p className="mt-1 text-xs text-red-600" data-testid="error-worker">
                  {errors.worker}
                </p>
              )}
            </div>

            {/* 作業員を選択した際の、直近の打刻履歴 (新規手動時に便利) */}
            {recentRecords.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  【直近の打刻履歴】クリックするとその打刻の修正モードになります
                </p>
                <div className="space-y-1">
                  {recentRecords.map((rec) => {
                    const formattedTime = new Date(rec.clocked_at).toLocaleString('ja-JP', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isSelected = selectedRecordId === rec.attendance_id;
                    return (
                      <button
                        key={rec.attendance_id}
                        type="button"
                        onClick={() => handleSelectRecordForEdit(rec)}
                        className={`w-full text-left px-3 py-2 text-xs rounded border transition-colors flex justify-between items-center ${
                          isSelected
                            ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                            : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span>
                          {formattedTime} - {rec.punch_type === 'CLOCK_IN' ? '出勤' : '退勤'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-normal">
                          {isSelected ? '現在選択中' : '選択して修正'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. 打刻日時入力 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="punch-date" className="block text-sm font-medium text-gray-700 mb-1">
                  打刻日 <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  id="punch-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full min-h-[44px] px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.datetime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label htmlFor="punch-time" className="block text-sm font-medium text-gray-700 mb-1">
                  打刻時刻 <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="time"
                  id="punch-time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`w-full min-h-[44px] px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.datetime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>
            {errors.datetime && (
              <p className="mt-1 text-xs text-red-600" data-testid="error-datetime">
                {errors.datetime}
              </p>
            )}

            {/* 3. 打刻種別 */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                打刻種別 <span className="text-red-500 font-bold">*</span>
              </span>
              <div className="flex space-x-4">
                <label className="flex-1 flex items-center justify-center border rounded-md p-3 cursor-pointer min-h-[44px] transition-all bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-500 border-gray-300">
                  <input
                    type="radio"
                    name="punchType"
                    value="CLOCK_IN"
                    checked={punchType === 'CLOCK_IN'}
                    onChange={() => setPunchType('CLOCK_IN')}
                    className="sr-only"
                  />
                  <span
                    className={`text-sm font-medium ${
                      punchType === 'CLOCK_IN' ? 'text-indigo-600 font-bold' : 'text-gray-700'
                    }`}
                  >
                    出勤
                  </span>
                  {punchType === 'CLOCK_IN' && (
                    <span className="ml-2 text-indigo-600 font-bold">✓</span>
                  )}
                </label>

                <label className="flex-1 flex items-center justify-center border rounded-md p-3 cursor-pointer min-h-[44px] transition-all bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-500 border-gray-300">
                  <input
                    type="radio"
                    name="punchType"
                    value="CLOCK_OUT"
                    checked={punchType === 'CLOCK_OUT'}
                    onChange={() => setPunchType('CLOCK_OUT')}
                    className="sr-only"
                  />
                  <span
                    className={`text-sm font-medium ${
                      punchType === 'CLOCK_OUT' ? 'text-indigo-600 font-bold' : 'text-gray-700'
                    }`}
                  >
                    退勤
                  </span>
                  {punchType === 'CLOCK_OUT' && (
                    <span className="ml-2 text-indigo-600 font-bold">✓</span>
                  )}
                </label>
              </div>
            </div>

            {/* 4. 修正理由 */}
            <div>
              <label htmlFor="reason-textarea" className="block text-sm font-medium text-gray-700 mb-1">
                修正・登録理由 <span className="text-red-500 font-bold">*</span>
              </label>
              <textarea
                id="reason-textarea"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例: 出勤時打刻漏れのため代理登録 / 端末不具合のため修正"
                className={`w-full p-3 border rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.reason ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.reason && (
                <p className="mt-1 text-xs text-red-600" data-testid="error-reason">
                  {errors.reason}
                </p>
              )}
            </div>

            {/* ボタン領域 */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] inline-flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed text-base"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                    送信中...
                  </>
                ) : (
                  '送信する'
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 min-h-[44px] inline-flex justify-center items-center bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-base"
              >
                キャンセル
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}