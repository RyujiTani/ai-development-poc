'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { attendanceRepository } from '@/features/attendance/repository/attendanceRepository';
import { AttendanceRecord, Contractor } from '@/features/attendance/domain/types';
import { logger } from '@/lib/logger';

function formatJST(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${y}年${m}月${date}日 ${h}:${min}:${sec}`;
}

function getTodayJST(): string {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const jst = new Date(utc + 3600000 * 9);
  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  const date = String(jst.getDate()).padStart(2, '0');
  return `${y}-${m}-${date}`;
}

function ThumbnailImage({ photoObjectId, onClick }: { photoObjectId: string; onClick?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoObjectId || photoObjectId === 'MANUAL') return;

    let active = true;
    let objectUrl: string | null = null;

    async function fetchImage() {
      try {
        const blob = await attendanceRepository.getPhotoBlob(photoObjectId);
        if (blob && active) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      } catch (err) {
        logger.error('FETCH_THUMBNAIL_BLOB_FAILED', { photoObjectId, error: String(err) });
      }
    }

    fetchImage();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoObjectId]);

  if (!photoObjectId || photoObjectId === 'MANUAL') {
    return <span className="text-gray-400 text-xs">手動登録</span>;
  }

  if (!url) {
    return <div className="w-16 h-12 bg-gray-200 animate-pulse rounded" />;
  }

  return (
    <img
      src={url}
      alt="サムネイル"
      onClick={onClick}
      className="w-16 h-12 object-cover rounded cursor-pointer border hover:opacity-85 transition-opacity"
      data-testid={`thumbnail-${photoObjectId}`}
    />
  );
}

function PhotoModal({ photoObjectId, onClose }: { photoObjectId: string; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoObjectId || photoObjectId === 'MANUAL') return;

    let active = true;
    let objectUrl: string | null = null;

    async function fetchImage() {
      try {
        const blob = await attendanceRepository.getPhotoBlob(photoObjectId);
        if (blob && active) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      } catch (err) {
        logger.error('FETCH_MODAL_PHOTO_BLOB_FAILED', { photoObjectId, error: String(err) });
      }
    }

    fetchImage();

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photoObjectId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
      data-testid="photo-modal-overlay"
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-lg overflow-hidden shadow-2xl p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-3 border-b">
          <h3 className="text-sm font-bold text-gray-700">写真拡大確認</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-bold p-1 text-sm"
            data-testid="close-photo-modal-btn"
          >
            閉じる
          </button>
        </div>
        <div className="flex items-center justify-center p-4 max-h-[70vh]">
          {url ? (
            <img
              src={url}
              alt="拡大写真"
              className="max-w-full max-h-[60vh] object-contain rounded"
              data-testid="modal-expanded-image"
            />
          ) : (
            <p className="text-gray-500 text-sm">写真を読み込み中...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CorrectionModal({
  record,
  onClose,
  onSuccess,
}: {
  record: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [punchType, setPunchType] = useState<'CLOCK_IN' | 'CLOCK_OUT'>(record.punch_type);
  const [clockedAt, setClockedAt] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const d = new Date(record.clocked_at);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setClockedAt(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('修正理由を入力してください');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const correctedBy = sessionStorage.getItem('user_id') || '';
      const isoClockedAt = new Date(clockedAt).toISOString();

      const result = await attendanceRepository.saveCorrection({
        attendanceId: record.attendance_id,
        workerId: record.worker_id,
        contractorId: record.contractor_id,
        punchType,
        clockedAt: isoClockedAt,
        reason: reason.trim(),
        correctedBy,
      });

      if (result.success) {
        logger.info('CORRECT_PUNCH_SAVE_SUCCESS', { attendanceId: record.attendance_id });
        onSuccess('打刻を修正しました');
      } else {
        setError('保存処理に失敗しました');
      }
    } catch (err) {
      logger.error('CORRECT_PUNCH_SAVE_FAILED', { error: String(err) });
      setError('送信に失敗しました。再試行してください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      data-testid="correction-modal-overlay"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-base font-bold text-gray-900">打刻データの修正</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded text-sm font-bold" data-testid="correction-error">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">対象作業員</label>
            <p className="text-base font-semibold text-gray-900 bg-gray-100 p-2 rounded">{record.worker_name}</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">所属企業</label>
            <p className="text-base font-semibold text-gray-900 bg-gray-100 p-2 rounded">{record.contractor_name}</p>
          </div>
          <div>
            <span className="block text-sm font-bold text-gray-700 mb-2">打刻種別</span>
            <div className="flex gap-4">
              <label className="flex-1 flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer min-h-[44px]">
                <input
                  type="radio"
                  name="punch_type"
                  checked={punchType === 'CLOCK_IN'}
                  onChange={() => setPunchType('CLOCK_IN')}
                  className="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-base text-gray-900 font-bold">出勤</span>
              </label>
              <label className="flex-1 flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer min-h-[44px]">
                <input
                  type="radio"
                  name="punch_type"
                  checked={punchType === 'CLOCK_OUT'}
                  onChange={() => setPunchType('CLOCK_OUT')}
                  className="h-5 w-5 border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="ml-3 text-base text-gray-900 font-bold">退勤</span>
              </label>
            </div>
          </div>
          <div>
            <label htmlFor="modal_clocked_at" className="block text-sm font-bold text-gray-700 mb-1">打刻日時</label>
            <input
              id="modal_clocked_at"
              type="datetime-local"
              value={clockedAt}
              onChange={(e) => setClockedAt(e.target.value)}
              className="block w-full rounded-md border border-gray-300 py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px]"
            />
          </div>
          <div>
            <label htmlFor="modal_reason" className="block text-sm font-bold text-gray-700 mb-1">
              修正理由 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="modal_reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例: 打刻忘れのため代理入力"
              className="block w-full rounded-md border border-gray-300 py-3 px-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px]"
            />
          </div>
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-gray-200 py-3.5 text-center text-sm font-bold text-gray-700 hover:bg-gray-300 transition-colors"
              style={{ minHeight: '56px' }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-blue-600 py-3.5 text-center text-sm font-bold text-white hover:bg-blue-500 transition-colors disabled:bg-blue-400"
              style={{ minHeight: '56px' }}
              data-testid="save-correction-btn"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterContractorId, setFilterContractorId] = useState('all');
  const [punchRecords, setPunchRecords] = useState<any[]>([]);
  const [contractorsList, setContractorsList] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // モーダル管理
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 認証チェック
  useEffect(() => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    const userId = sessionStorage.getItem('user_id');
    const role = sessionStorage.getItem('role');

    if (!userId || role !== 'FACTORY_ADMIN') {
      logger.warn('UNAUTHORIZED_ACCESS_ATTEMPT_ATTENDANCE_HISTORY', { userId, role });
      router.push('/admin-login');
    } else {
      setIsAuthenticated(true);
      setFilterDate(getTodayJST());
    }
  }, [router]);

  // マスタと履歴データ取得
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const contractors = await attendanceRepository.getActiveContractors();
        setContractorsList(contractors);

        const history = await attendanceRepository.getAttendanceHistory({
          date: filterDate || undefined,
          contractorId: filterContractorId,
        });
        setPunchRecords(history);
      } catch (err) {
        logger.error('LOAD_ATTENDANCE_HISTORY_FAILED', { error: String(err) });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [isAuthenticated, filterDate, filterContractorId]);

  const handleRefresh = async () => {
    try {
      const history = await attendanceRepository.getAttendanceHistory({
        date: filterDate || undefined,
        contractorId: filterContractorId,
      });
      setPunchRecords(history);
      setCurrentPage(1);
    } catch (err) {
      logger.error('REFRESH_ATTENDANCE_HISTORY_FAILED', { error: String(err) });
    }
  };

  const handleCorrectionSuccess = async (msg: string) => {
    setEditingRecord(null);
    setSuccessMessage(msg);
    await handleRefresh();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ページネーション計算
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = punchRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(punchRecords.length / itemsPerPage);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 text-gray-900">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">打刻履歴確認</h1>
            <p className="text-sm text-gray-600 mt-1">工場側管理者用確認画面</p>
          </div>
          <button
            onClick={() => router.push('/factory/dashboard')}
            className="rounded bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500 transition-colors"
            style={{ minHeight: '44px' }}
          >
            ダッシュボードへ
          </button>
        </div>
      </header>

      {/* メイン */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-6 md:py-8 flex flex-col space-y-6">
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg font-bold" data-testid="global-success-message">
            {successMessage}
          </div>
        )}

        {/* フィルタエリア */}
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="filter-date" className="block text-sm font-bold text-gray-700 mb-1">
                日付指定
              </label>
              <input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => {
                  setFilterDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="block w-full rounded-md border border-gray-300 py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px]"
                data-testid="filter-date-input"
              />
            </div>

            <div>
              <label htmlFor="filter-contractor" className="block text-sm font-bold text-gray-700 mb-1">
                外注先フィルタ
              </label>
              <select
                id="filter-contractor"
                value={filterContractorId}
                onChange={(e) => {
                  setFilterContractorId(e.target.value);
                  setCurrentPage(1);
                }}
                className="block w-full rounded-md border border-gray-300 py-3 px-3 text-gray-900 focus:ring-2 focus:ring-blue-600 text-base min-h-[44px] bg-white"
                data-testid="filter-contractor-select"
              >
                <option value="all">すべて表示</option>
                {contractorsList.map((c) => (
                  <option key={c.contractor_id} value={c.contractor_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <button
                onClick={handleRefresh}
                className="w-full rounded-lg bg-blue-600 py-3 text-center text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-sm"
                style={{ minHeight: '44px' }}
                data-testid="search-btn"
              >
                検索・更新
              </button>
            </div>
          </div>
        </div>

        {/* 履歴テーブル */}
        <div className="bg-white rounded-xl shadow overflow-hidden flex-1 flex flex-col">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 font-bold">読み込み中...</div>
          ) : (
            <>
              {/* PC向けテーブル */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">作業員名</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先企業名</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">打刻種別</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">打刻日時</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">写真確認</th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">操作</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200" data-testid="attendance-tbody">
                    {currentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                          対象日の打刻履歴がありません。
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((record) => (
                        <tr key={record.attendance_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{record.worker_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.contractor_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                record.punch_type === 'CLOCK_IN'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {record.punch_type === 'CLOCK_IN' ? '出勤' : '退勤'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatJST(record.clocked_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <ThumbnailImage
                              photoObjectId={record.photo_object_id}
                              onClick={() => {
                                if (record.photo_object_id && record.photo_object_id !== 'MANUAL') {
                                  setSelectedPhotoId(record.photo_object_id);
                                }
                              }}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setEditingRecord(record)}
                              className="text-blue-600 hover:text-blue-900 font-semibold px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
                              style={{ minHeight: '44px' }}
                              data-testid={`correct-btn-${record.attendance_id}`}
                            >
                              修正
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* モバイル向けカードUI */}
              <div className="md:hidden divide-y divide-gray-200">
                {currentRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    対象日の打刻履歴がありません。
                  </div>
                ) : (
                  currentRecords.map((record) => (
                    <div key={record.attendance_id} className="p-4 space-y-3" data-testid={`mobile-card-${record.attendance_id}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-bold text-gray-900">{record.worker_name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{record.contractor_name}</p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.punch_type === 'CLOCK_IN'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {record.punch_type === 'CLOCK_IN' ? '出勤' : '退勤'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-600">
                        <span>{formatJST(record.clocked_at)}</span>
                        <ThumbnailImage
                          photoObjectId={record.photo_object_id}
                          onClick={() => {
                            if (record.photo_object_id && record.photo_object_id !== 'MANUAL') {
                              setSelectedPhotoId(record.photo_object_id);
                            }
                          }}
                        />
                      </div>
                      <div className="flex pt-2 justify-end border-t border-gray-100">
                        <button
                          onClick={() => setEditingRecord(record)}
                          className="w-full text-center py-2.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded"
                          style={{ minHeight: '44px' }}
                          data-testid={`mobile-correct-btn-${record.attendance_id}`}
                        >
                          修正する
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                    style={{ minHeight: '44px' }}
                    data-testid="pagination-prev"
                  >
                    前へ
                  </button>
                  <span className="text-sm text-gray-700" data-testid="pagination-info">
                    {currentPage} / {totalPages} ページ
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
                    style={{ minHeight: '44px' }}
                    data-testid="pagination-next"
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 写真拡大表示モーダル */}
      {selectedPhotoId && (
        <PhotoModal photoObjectId={selectedPhotoId} onClose={() => setSelectedPhotoId(null)} />
      )}

      {/* 打刻修正モーダル */}
      {editingRecord && (
        <CorrectionModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSuccess={handleCorrectionSuccess}
        />
      )}
    </div>
  );
}