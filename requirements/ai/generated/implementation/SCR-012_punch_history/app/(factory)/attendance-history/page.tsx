'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { sessionService, SessionUser } from '../../../lib/auth/session';
import { IndexedDBAttendanceRepository } from '../../../features/attendance/repository/attendanceRepository';
import { IndexedDBContractorRepository } from '../../../features/contractor/repository/contractorRepository';
import { IndexedDBWorkerRepository } from '../../../features/worker/repository/workerRepository';
import { AttendanceRecord, PunchType } from '../../../features/attendance/domain/types';
import { Contractor } from '../../../features/contractor/domain/types';
import { Worker } from '../../../features/worker/domain/types';
import { seedDatabase } from '../../../lib/db/indexedDbHelper';
import { logger } from '../../../lib/logger/logger';

export default function AttendanceHistoryPage() {
  const router = useRouter();

  // Repositories
  const attendanceRepo = useRef(new IndexedDBAttendanceRepository());
  const contractorRepo = useRef(new IndexedDBContractorRepository());
  const workerRepo = useRef(new IndexedDBWorkerRepository());

  // Component States
  const [session, setSession] = useState<SessionUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter States
  const [filterDate, setFilterDate] = useState<string>('2026-04-13'); // デフォルト：シードデータのある日付
  const [filterContractorId, setFilterContractorId] = useState<string>('');

  // Loaded Master Data & Records
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Expanded Photo Modal State
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);

  // Edit / Register Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);

  // Modal Form Inputs
  const [formWorkerId, setFormWorkerId] = useState('');
  const [formPunchType, setFormPunchType] = useState<PunchType>('CLOCK_IN');
  const [formDateTime, setFormDateTime] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // Authentication Guard
  useEffect(() => {
    const currentSession = sessionService.getSession();
    if (!currentSession || currentSession.role !== 'FACTORY_ADMIN') {
      logger.info('UNAUTHORIZED_ACCESS_ATTEMPT', { attemptedRole: currentSession?.role });
      router.push('/login');
    } else {
      setSession(currentSession);
      setIsAuthChecking(false);
    }
  }, [router]);

  // Toast auto-close
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load Master Data
  const loadMasterData = useCallback(async () => {
    try {
      const allContractors = await contractorRepo.current.getAll();
      const allWorkers = await workerRepo.current.getAll();
      setContractors(allContractors);
      setWorkers(allWorkers);
    } catch (err) {
      logger.error('LOAD_MASTER_DATA_FAILED', err);
      setToast({ message: 'マスタデータの読み込みに失敗しました。', type: 'error' });
    }
  }, []);

  // Load Attendance Records with current filters
  const loadAttendanceRecords = useCallback(async () => {
    if (!filterDate) return;
    setIsLoading(true);
    try {
      logger.info('GET_FILTERED_RECORDS', { date: filterDate, contractor_id: filterContractorId || undefined });
      const filtered = await attendanceRepo.current.getFilteredRecords(filterDate, filterContractorId || undefined);
      setRecords(filtered);
    } catch (err) {
      logger.error('LOAD_ATTENDANCE_RECORDS_FAILED', err);
      setToast({ message: '打刻履歴の取得に失敗しました。', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [filterDate, filterContractorId]);

  // Initial Seed & Load Trigger
  useEffect(() => {
    if (isAuthChecking) return;
    const initData = async () => {
      try {
        await seedDatabase();
        await loadMasterData();
        await loadAttendanceRecords();
      } catch (err) {
        logger.error('INITIALIZE_DATABASE_FAILED', err);
      }
    };
    initData();
  }, [isAuthChecking, loadMasterData, loadAttendanceRecords]);

  // Re-trigger load when filters change
  const handleFilterChange = () => {
    loadAttendanceRecords();
  };

  // Seed Reset Function for Prototyping
  const handleResetDatabase = async () => {
    if (!confirm('全てのデータベースを初期シードデータにリセットしますか？')) return;
    try {
      await seedDatabase(true);
      setFilterDate('2026-04-13');
      setFilterContractorId('');
      await loadMasterData();
      await loadAttendanceRecords();
      setToast({ message: 'データベースを初期リセットしました。', type: 'success' });
    } catch (err) {
      logger.error('RESET_DATABASE_FAILED', err);
      setToast({ message: 'リセットに失敗しました。', type: 'error' });
    }
  };

  // Handle Photo Click for Modal Expansion
  const handlePhotoClick = async (photoObjectId: string) => {
    try {
      const photoBlobData = await attendanceRepo.current.getPhotoBlob(photoObjectId);
      if (photoBlobData) {
        const objectUrl = URL.createObjectURL(photoBlobData.blob);
        setExpandedPhotoUrl(objectUrl);
        logger.info('EXPAND_PHOTO_MODAL_OPEN', { photo_object_id: photoObjectId });
      } else {
        setToast({ message: '写真データが見つかりません。', type: 'error' });
      }
    } catch (err) {
      logger.error('FETCH_PHOTO_BLOB_FAILED', err, { photo_object_id: photoObjectId });
      setToast({ message: '写真データの取得に失敗しました。', type: 'error' });
    }
  };

  // Close Expanded Photo Modal
  const handleClosePhotoModal = () => {
    if (expandedPhotoUrl) {
      URL.revokeObjectURL(expandedPhotoUrl);
      setExpandedPhotoUrl(null);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setFormWorkerId(record.worker_id);
    setFormPunchType(record.punch_type);
    
    // Convert to timezone-local ISO string format 'YYYY-MM-DDTHH:MM' for input type="datetime-local"
    const localDate = new Date(record.clocked_at);
    const timezoneOffset = localDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localDate.getTime() - timezoneOffset).toISOString().slice(0, 16);
    setFormDateTime(localISOTime);
    
    setFormReason('');
    setFormValidationError(null);
  };

  // Open New Record Modal
  const handleOpenNewRecordModal = () => {
    setIsNewRecordModalOpen(true);
    setFormWorkerId('');
    setFormPunchType('CLOCK_IN');
    
    // Set current date/time in local format
    const localDate = new Date();
    const timezoneOffset = localDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(localDate.getTime() - timezoneOffset).toISOString().slice(0, 16);
    setFormDateTime(localISOTime);

    setFormReason('');
    setFormValidationError(null);
  };

  // Form Save Action (Create or Update)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReason.trim()) {
      setFormValidationError('修正理由・登録理由は必須です。');
      return;
    }
    if (!formWorkerId) {
      setFormValidationError('対象作業員を選択してください。');
      return;
    }
    if (!formDateTime) {
      setFormValidationError('有効な日時を入力してください。');
      return;
    }

    setIsLoading(true);
    setFormValidationError(null);

    try {
      const selectedWorker = workers.find(w => w.worker_id === formWorkerId);
      const contractorId = selectedWorker ? selectedWorker.contractor_id : '';
      const isoClockedAt = new Date(formDateTime).toISOString();
      const currentUserId = session?.userId || 'unknown_admin';

      if (editingRecord) {
        // Update Existing Record
        logger.info('UPDATE_RECORD_ATTEMPT', { record_id: editingRecord.attendance_id });
        await attendanceRepo.current.updateRecord(
          editingRecord.attendance_id,
          {
            worker_id: formWorkerId,
            contractor_id: contractorId,
            punch_type: formPunchType,
            clocked_at: isoClockedAt,
          },
          formReason,
          currentUserId
        );
        setToast({ message: '打刻履歴を更新しました。', type: 'success' });
        setEditingRecord(null);
      } else {
        // Create New Record
        logger.info('CREATE_RECORD_ATTEMPT', { worker_id: formWorkerId });
        await attendanceRepo.current.createRecord(
          {
            worker_id: formWorkerId,
            contractor_id: contractorId,
            punch_type: formPunchType,
            clocked_at: isoClockedAt,
            punched_by: currentUserId,
            photo_object_id: 'p_manual' // 手動登録時のプレースホルダー
          },
          currentUserId,
          formReason
        );
        setToast({ message: '手動打刻を登録しました。', type: 'success' });
        setIsNewRecordModalOpen(false);
      }
      await loadAttendanceRecords();
    } catch (err) {
      logger.error('SAVE_RECORD_FAILED', err);
      setFormValidationError('保存処理中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionService.clearSession();
    router.push('/login');
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">外注作業員 打刻履歴確認画面</h1>
            <p className="text-sm text-gray-500">工場管理者ポータル</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
              {session?.displayName} (工場管理者)
            </span>
            <button
              onClick={handleResetDatabase}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 px-3 rounded shadow transition"
            >
              シードリセット
            </button>
            <button
              onClick={handleLogout}
              className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-1.5 px-3.5 rounded transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Global Toast Notification */}
        {toast && (
          <div className={`mb-6 p-4 rounded-lg shadow-md flex justify-between items-center text-white ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}>
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-4 font-bold hover:opacity-75">×</button>
          </div>
        )}

        {/* Filters and Search Action Dashboard */}
        <section className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">表示条件指定</h2>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <div>
                <label htmlFor="filter-date" className="block text-sm font-medium text-gray-600 mb-1">対象日付</label>
                <input
                  type="date"
                  id="filter-date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm text-base"
                />
              </div>
              <div>
                <label htmlFor="filter-contractor" className="block text-sm font-medium text-gray-600 mb-1">外注先企業</label>
                <select
                  id="filter-contractor"
                  value={filterContractorId}
                  onChange={(e) => setFilterContractorId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm text-base"
                >
                  <option value="">すべての外注先</option>
                  {contractors.map((c) => (
                    <option key={c.contractor_id} value={c.contractor_id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={handleFilterChange}
                disabled={isLoading}
                className="flex-1 md:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-md shadow transition disabled:opacity-50 text-base"
              >
                {isLoading ? '読込中...' : '検索・再取得'}
              </button>
              <button
                onClick={handleOpenNewRecordModal}
                className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-md shadow transition text-base"
              >
                新規打刻登録
              </button>
            </div>
          </div>
        </section>

        {/* Attendance Records Table */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">作業員名</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">外注先企業名</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">打刻種別</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">打刻日時</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">本人写真</th>
                  <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500 text-base">
                      指定された条件に一致する打刻実績データが存在しません。
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    const worker = workers.find((w) => w.worker_id === record.worker_id);
                    const contractor = contractors.find((c) => c.contractor_id === record.contractor_id);
                    return (
                      <tr key={record.attendance_id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base font-medium text-gray-900">{worker ? worker.name : '不明な作業員'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{contractor ? contractor.name : '不明な外注先'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            record.punch_type === 'CLOCK_IN' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.punch_type === 'CLOCK_IN' ? '出勤' : '退勤'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-mono">
                            {new Date(record.clocked_at).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {record.photo_object_id === 'p_manual' ? (
                            <span className="text-xs text-gray-400 italic">手動登録 (写真なし)</span>
                          ) : (
                            <button
                              onClick={() => handlePhotoClick(record.photo_object_id)}
                              className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md overflow-hidden block mx-auto border hover:opacity-85 transition shadow-sm"
                              title="クリックで拡大"
                            >
                              <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 relative">
                                📷 プレビュー
                              </div>
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <button
                            onClick={() => handleOpenEditModal(record)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded shadow-sm font-semibold transition"
                          >
                            修正
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Expanded Photo View Modal */}
      {expandedPhotoUrl && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-4">
              <h3 className="text-lg font-bold text-gray-900">本人確認写真</h3>
              <button
                onClick={handleClosePhotoModal}
                className="text-gray-400 hover:text-gray-600 font-bold text-2xl focus:outline-none"
              >
                ×
              </button>
            </div>
            <div className="flex justify-center bg-gray-100 p-2 rounded border mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={expandedPhotoUrl}
                alt="Expanded Attendance Record Preview"
                className="max-h-96 max-w-full object-contain"
              />
            </div>
            <div className="text-center">
              <button
                onClick={handleClosePhotoModal}
                className="bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 px-6 rounded transition text-sm"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / New Attendance Record Form Modal */}
      {(editingRecord || isNewRecordModalOpen) && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
              {editingRecord ? '打刻履歴情報の修正' : '新規手動打刻登録'}
            </h3>

            {formValidationError && (
              <div className="bg-rose-50 text-rose-700 p-3 rounded border border-rose-200 text-sm mb-4 font-semibold">
                ⚠️ {formValidationError}
              </div>
            )}

            <form onSubmit={handleSaveRecord} className="space-y-4 text-base">
              {/* Worker Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  対象作業員 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formWorkerId}
                  onChange={(e) => setFormWorkerId(e.target.value)}
                  disabled={!!editingRecord}
                  className="w-full border border-gray-300 rounded-md py-2.5 px-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition"
                >
                  <option value="">-- 作業員を選択 --</option>
                  {workers.map((w) => {
                    const company = contractors.find((c) => c.contractor_id === w.contractor_id);
                    return (
                      <option key={w.worker_id} value={w.worker_id}>
                        {w.name} ({company ? company.name : '不明な企業'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Punch Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  打刻種別 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="formPunchType"
                      value="CLOCK_IN"
                      checked={formPunchType === 'CLOCK_IN'}
                      onChange={() => setFormPunchType('CLOCK_IN')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    出勤
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input
                      type="radio"
                      name="formPunchType"
                      value="CLOCK_OUT"
                      checked={formPunchType === 'CLOCK_OUT'}
                      onChange={() => setFormPunchType('CLOCK_OUT')}
                      className="w-4 h-4 text-red-600 focus:ring-red-500"
                    />
                    退勤
                  </label>
                </div>
              </div>

              {/* Date & Time Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  打刻日時 <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formDateTime}
                  onChange={(e) => setFormDateTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition font-mono"
                />
              </div>

              {/* Correction Reason text input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {editingRecord ? '修正の理由' : '登録の理由'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="（例）打刻忘れ・修正指示があったため等"
                  rows={3}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition placeholder-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">※ 修正・手動登録の経緯を必ず入力してください。</p>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                    setIsNewRecordModalOpen(false);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-5 rounded transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded shadow transition disabled:opacity-50"
                >
                  {isLoading ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}