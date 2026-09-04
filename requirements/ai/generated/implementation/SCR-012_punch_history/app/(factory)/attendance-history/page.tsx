'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { checkAuth, getSession } from '../../../lib/auth/mockAuth';
import { AttendanceRecord, Contractor, Worker, User } from '../../../features/attendance/domain/types';
import { AttendanceUseCase } from '../../../features/attendance/usecase/attendanceUseCase';
import { IndexedDBAttendanceRepository } from '../../../features/attendance/repository/attendanceRepository';
import { IndexedDBContractorRepository } from '../../../features/contractor/repository/contractorRepository';
import { IndexedDBWorkerRepository } from '../../../features/worker/repository/workerRepository';
import { openDatabase, seedDatabase } from '../../../lib/db/indexedDb';

// メモリリーク防止のため、Blobを個別に制御してアンマウント時に revokeObjectURL を安全に実行するコンポーネント
function ThumbnailImage({
  photoObjectId,
  useCase,
  onClick,
}: {
  photoObjectId: string;
  useCase: AttendanceUseCase;
  onClick: (url: string) => void;
}) {
  const [src, setSrc] = useState<string>('');
  const [error, setError] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPhoto() {
      const res = await useCase.getPhotoUrl(photoObjectId);
      if (active) {
        if (res.success) {
          // 以前のURLがあれば破棄
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
          objectUrlRef.current = res.value;
          setSrc(res.value);
        } else {
          setError(true);
        }
      }
    }

    loadPhoto();

    return () => {
      active = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [photoObjectId, useCase]);

  if (error || !src) {
    return (
      <div className="w-12 h-12 bg-gray-200 flex items-center justify-center text-gray-500 rounded text-[10px]">
        画像なし
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="打刻証拠写真"
      className="w-12 h-12 object-cover rounded cursor-pointer border border-gray-300 hover:opacity-80 transition-opacity"
      onClick={() => onClick(src)}
    />
  );
}

export default function AttendanceHistoryPage() {
  const router = useRouter();

  // DIインスタンスの作成
  const useCase = useMemo(() => {
    return new AttendanceUseCase(
      new IndexedDBAttendanceRepository(),
      new IndexedDBContractorRepository(),
      new IndexedDBWorkerRepository()
    );
  }, []);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // States
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterContractorId, setFilterContractorId] = useState<string>('all');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Modal States
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Form States (打刻修正用)
  const [correctionDatetime, setCorrectionDatetime] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // 認証ガードチェック
  useEffect(() => {
    const isOk = checkAuth('FACTORY_ADMIN');
    if (!isOk) {
      setAuthorized(false);
      router.push('/admin/login');
    } else {
      setAuthorized(true);
      setCurrentUser(getSession());
    }
  }, [router]);

  // 初期データ取得 & データベース自動シード
  const loadData = async (dateParam?: string, contractorParam?: string) => {
    setLoading(true);
    setError(null);
    try {
      // データベースが空の場合に自動シード
      const db = await openDatabase();
      const checkEmpty = () => {
        return new Promise<boolean>((resolve) => {
          const tx = db.transaction('attendance_records', 'readonly');
          const store = tx.objectStore('attendance_records');
          const countReq = store.count();
          countReq.onsuccess = () => resolve(countReq.result === 0);
          countReq.onerror = () => resolve(true);
        });
      };

      const isEmpty = await checkEmpty();
      if (isEmpty) {
        await seedDatabase(db);
      }

      const dateToUse = dateParam !== undefined ? dateParam : filterDate;
      const contractorToUse = contractorParam !== undefined ? contractorParam : filterContractorId;

      const result = await useCase.getAttendanceHistory(dateToUse, contractorToUse);
      if (result.success) {
        setRecords(result.value.records);
        setContractors(result.value.contractors);
        setWorkers(result.value.workers);
      } else {
        setError(result.error.message);
      }
    } catch (e: any) {
      setError(e.message || 'エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) {
      loadData();
    }
  }, [authorized]);

  // トースト自動非表示
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 検索・フィルタ変更イベントハンドラ
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFilterDate(val);
    setCurrentPage(1);
    loadData(val, filterContractorId);
  };

  const handleContractorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilterContractorId(val);
    setCurrentPage(1);
    loadData(filterDate, val);
  };

  // フィルタのクリア操作（安全に空パラメータとして全件検索フォールバック）
  const handleClearFilters = () => {
    setFilterDate('');
    setFilterContractorId('all');
    setCurrentPage(1);
    loadData('', 'all');
  };

  // 手動シードリセット機能（デバッグ/開発検証用）
  const handleManualReset = async () => {
    if (confirm('IndexedDBの全データをリセットし、初期データを再投入します。よろしいですか？')) {
      try {
        const db = await openDatabase();
        await seedDatabase(db);
        setToast({ message: 'データベースのリセットが完了しました。', type: 'success' });
        loadData();
      } catch (e: any) {
        setToast({ message: 'リセットに失敗しました: ' + e.message, type: 'error' });
      }
    }
  };

  // 打刻修正フォーム展開
  const handleOpenCorrection = (record: AttendanceRecord) => {
    setEditingRecord(record);
    // 時刻の丸め・フォーマット変換 (YYYY-MM-DDTHH:MM)
    const localTime = new Date(record.clocked_at);
    // UTCからローカル時間を調整して datetime-local のフォーマットにする
    const offset = localTime.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localTime.getTime() - offset).toISOString().slice(0, 16);

    setCorrectionDatetime(localISOTime);
    setCorrectionReason('');
    setCorrectionError(null);
    setIsCorrectionModalOpen(true);
  };

  // 打刻修正の保存
  const handleSaveCorrection = async () => {
    if (!editingRecord || !currentUser) return;

    if (!correctionReason || !correctionReason.trim()) {
      setCorrectionError('修正理由は必須項目です。');
      return;
    }

    try {
      const clockedAtIso = new Date(correctionDatetime).toISOString();
      const res = await useCase.correctPunch(
        editingRecord.attendance_id,
        clockedAtIso,
        correctionReason,
        currentUser.user_id
      );

      if (res.success) {
        setToast({ message: '打刻情報を修正しました。', type: 'success' });
        setIsCorrectionModalOpen(false);
        setEditingRecord(null);
        loadData();
      } else {
        setCorrectionError(res.error.message);
      }
    } catch (e: any) {
      setCorrectionError(e.message || '保存に失敗しました。');
    }
  };

  // マッピング用ヘルパー
  const getWorkerName = (workerId: string) => {
    const w = workers.find((item) => item.worker_id === workerId);
    return w ? w.name : '不明な作業員';
  };

  const getContractorName = (contractorId: string) => {
    const c = contractors.find((item) => item.contractor_id === contractorId);
    return c ? c.name : '不明な外注先';
  };

  // ページネーション用計算
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return records.slice(startIndex, startIndex + itemsPerPage);
  }, [records, currentPage]);

  const totalPages = Math.max(1, Math.ceil(records.length / itemsPerPage));

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-500 font-medium">認可ステータスを確認中...</div>
      </div>
    );
  }

  if (authorized === false) {
    return null; // リダイレクト処理中
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* 共通ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900">外注作業員 勤怠・配置管理システム</h1>
            <p className="text-xs text-gray-500">工場側管理者モード - 打刻履歴確認</p>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="text-sm bg-blue-50 text-blue-800 px-3 py-1.5 rounded-full font-medium">
                {currentUser.display_name}
              </span>
            )}
            <button
              onClick={() => {
                sessionStorage.removeItem('worker_attendance_session');
                router.push('/admin/login');
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors font-semibold"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* トースト表示 */}
        {toast && (
          <div
            className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-2 transition-transform duration-300 ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* 画面説明・ユーティリティ */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">打刻履歴一覧</h2>
            <p className="text-sm text-gray-500 mt-1">
              外注先から送信された写真つき打刻の実績を確認・管理します。
            </p>
          </div>
          <button
            onClick={handleManualReset}
            className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-2 rounded font-semibold transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19"
              />
            </svg>
            全データリセット＆初期化
          </button>
        </div>

        {/* フィルタ条件領域 (SCR-012-UI-001) */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="filter-date" className="block text-xs font-bold text-gray-700 mb-1.5">
                日付フィルタ
              </label>
              <input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={handleDateChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="filter-contractor" className="block text-xs font-bold text-gray-700 mb-1.5">
                外注先企業フィルタ
              </label>
              <select
                id="filter-contractor"
                value={filterContractorId}
                onChange={handleContractorChange}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">すべて表示</option>
                {contractors.map((c) => (
                  <option key={c.contractor_id} value={c.contractor_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                フィルタ解除
              </button>
            </div>
          </div>
        </div>

        {/* データ表示エリア */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium text-sm">データを読み込み中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center shadow-sm">
            <p className="text-red-700 font-bold mb-2 text-sm">エラーが発生しました</p>
            <p className="text-red-600 text-xs mb-4">{error}</p>
            <button
              onClick={() => loadData()}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-xs transition-colors"
            >
              再読み込み
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-semibold text-sm">条件に一致する打刻履歴がありません。</p>
            <p className="text-xs text-gray-400 mt-1">日付や外注先フィルタの条件を変更してください。</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* テーブル (SCR-012-UI-002) */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-bold">作業員名</th>
                    <th className="px-6 py-4 font-bold">外注先企業</th>
                    <th className="px-6 py-4 font-bold text-center">打刻種別</th>
                    <th className="px-6 py-4 font-bold">打刻日時</th>
                    <th className="px-6 py-4 font-bold text-center">証拠写真</th>
                    <th className="px-6 py-4 font-bold text-right">アクション</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedRecords.map((record) => (
                    <tr key={record.attendance_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-950">
                        {getWorkerName(record.worker_id)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {getContractorName(record.contractor_id)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-bold leading-none ${
                            record.punch_type === 'CLOCK_IN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {record.punch_type === 'CLOCK_IN' ? '出勤' : '退勤'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        {new Date(record.clocked_at).toLocaleString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          {/* 写真サムネイル (SCR-012-UI-003) */}
                          <ThumbnailImage
                            photoObjectId={record.photo_object_id}
                            useCase={useCase}
                            onClick={(url) => setSelectedPhotoUrl(url)}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenCorrection(record)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold py-1.5 px-3 rounded text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          修正
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ページネーション (SCR-012-UI-004) */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-gray-500 font-medium">
                全 {records.length} 件中 {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, records.length)} 件を表示
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 font-bold p-2 rounded text-xs transition-colors"
                >
                  前へ
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                      currentPage === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="bg-white border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-700 font-bold p-2 rounded text-xs transition-colors"
                >
                  次へ
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 写真拡大モーダル (SCR-012-EV-002) */}
      {selectedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoUrl(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm">打刻エビデンス写真</h3>
              <button
                onClick={() => setSelectedPhotoUrl(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="bg-gray-950 flex items-center justify-center p-2 min-h-[300px] max-h-[75vh]">
              <img src={selectedPhotoUrl} alt="拡大証拠写真" className="max-w-full max-h-[70vh] object-contain" />
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
              <button
                onClick={() => setSelectedPhotoUrl(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg text-xs transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 打刻修正モーダル (SCR-012-EV-003) */}
      {isCorrectionModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">打刻実績の修正</h3>
              <p className="text-xs text-gray-500 mt-1">対象作業員: {getWorkerName(editingRecord.worker_id)}</p>
            </div>
            <div className="p-5 space-y-4">
              {correctionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg font-medium">
                  {correctionError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  修正後の打刻日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={correctionDatetime}
                  onChange={(e) => setCorrectionDatetime(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  修正理由 <span className="text-red-500">*</span>
                </label>
                <textarea
                  placeholder="打刻漏れ対応、端末エラーのため、等"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  ※修正理由は監査ログ（モック）に保存され、変更できません。
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCorrectionModalOpen(false);
                  setEditingRecord(null);
                }}
                className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded-lg text-xs transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveCorrection}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-lg text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                修正を適用する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}