'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth/authContext';
import { AttendanceRepository, EnrichedAttendanceRecord } from '@/features/attendance/repository/attendanceRepository';
import { Contractor } from '@/features/attendance/domain/types';
import { seedDatabase } from '@/lib/db/idb';

const repository = new AttendanceRepository();

function AttendanceHistoryContent() {
  const { isAuthenticated, role, display_name, loginAsAdmin, logout } = useAuth();

  // States
  const [filterDate, setFilterDate] = useState('2026-04-13');
  const [filterContractorId, setFilterContractorId] = useState<string>('');
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<EnrichedAttendanceRecord[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal states
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<EnrichedAttendanceRecord | null>(null);
  
  // Form states
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState<'CLOCK_IN' | 'CLOCK_OUT'>('CLOCK_IN');
  const [editReason, setEditReason] = useState('');
  const [validationError, setValidationError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Photo URLs reference to cleanup
  const activeUrlsRef = useRef<string[]>([]);

  // Cleanup Object URLs to avoid memory leaks
  const cleanupPhotoUrls = () => {
    activeUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    activeUrlsRef.current = [];
    setPhotoUrls(new Map());
  };

  useEffect(() => {
    return () => {
      activeUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Authorization check & Seed init
  useEffect(() => {
    async function init() {
      try {
        await seedDatabase();
        const activeContractors = await repository.getActiveContractors();
        setContractors(activeContractors);
      } catch (err) {
        console.error('Init Database Error:', err);
      }
    }
    if (typeof window !== 'undefined') {
      init();
    }
  }, []);

  // Fetch Attendance Records
  const fetchRecords = async () => {
    if (!filterDate) return;
    setIsLoading(true);
    try {
      cleanupPhotoUrls();

      const cId = filterContractorId === '' ? null : filterContractorId;
      const data = await repository.getAttendanceRecords(filterDate, cId);
      setAttendanceRecords(data);
      setCurrentPage(1); 

      // Pre-load photos blobs to Object URLs
      const newUrlsMap = new Map<string, string>();
      for (const record of data) {
        if (record.photo_object_id) {
          const blob = await repository.getPhotoBlob(record.photo_object_id);
          if (blob) {
            const url = URL.createObjectURL(blob);
            newUrlsMap.set(record.photo_object_id, url);
            activeUrlsRef.current.push(url);
          }
        }
      }
      setPhotoUrls(newUrlsMap);
    } catch (err) {
      showToast('データ取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && role === 'FACTORY_ADMIN') {
      fetchRecords();
    }
  }, [isAuthenticated, role]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Render mock security redirect state
  if (!isAuthenticated || role !== 'FACTORY_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">アクセス制限エラー</h1>
          <p className="text-gray-600 mb-6">
            この画面は工場管理者（FACTORY_ADMIN）専用です。ログインしていないか、権限がありません。
          </p>
          <div className="space-y-4">
            <button
              onClick={loginAsAdmin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-md transition duration-200 shadow-sm"
            >
              【デモ用】工場管理者としてクイックログイン
            </button>
            <button
              onClick={() => { window.location.href = '/login'; }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-md transition duration-200"
            >
              管理者ログイン画面（SCR-010）へ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  // Handle Reset Database
  const handleResetDatabase = async () => {
    if (confirm('すべてのデータ（打刻実績、修正、写真等）をリセットし初期シードを再投入します。よろしいですか？')) {
      await seedDatabase(true);
      showToast('データベースを再シードしました');
      fetchRecords();
    }
  };

  // Open Edit Dialog
  const openEditModal = (record: EnrichedAttendanceRecord) => {
    setEditingRecord(record);
    // Convert ISO string back to local datetime string for input format YYYY-MM-DDTHH:mm
    const dateObj = new Date(record.clocked_at);
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
    
    setEditTime(localISOTime);
    setEditType(record.punch_type);
    setEditReason('');
    setValidationError('');
  };

  // Save Edit Correction
  const handleSaveCorrection = async () => {
    if (!editingRecord) return;
    
    const trimmedReason = editReason.trim();
    if (!trimmedReason) {
      setValidationError('修正理由は必須入力です');
      return;
    }

    try {
      const localDate = new Date(editTime);
      const isoString = localDate.toISOString();

      await repository.updateAttendanceRecord(
        editingRecord.attendance_id,
        {
          clocked_at: isoString,
          punch_type: editType
        },
        trimmedReason,
        'u-1' // current user id mock
      );

      showToast('打刻情報を更新しました');
      setEditingRecord(null);
      fetchRecords();
    } catch (err) {
      showToast('打刻情報の更新に失敗しました');
    }
  };

  // Pagination Calculations
  const totalPages = Math.ceil(attendanceRecords.length / itemsPerPage);
  const paginatedRecords = attendanceRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatTimeStr = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white py-3 px-6 rounded-lg shadow-xl flex items-center space-x-2 animate-bounce">
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              工場管理者モード
            </span>
            <h1 className="text-2xl font-bold mt-1 text-gray-900">打刻履歴確認画面</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-right">
              <p className="text-gray-500">ログインユーザー</p>
              <p className="font-bold text-gray-900">{display_name}</p>
            </div>
            <button
              onClick={logout}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-md text-sm transition duration-150"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug utility info */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-md flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <p className="text-sm text-blue-700 font-medium">
            検証用：初期シードデータは自動投入されます。状態をクリアしたい場合は右のリセットボタンをご利用ください。
          </p>
          <button
            onClick={handleResetDatabase}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded shadow-sm transition"
          >
            全データリセット
          </button>
        </div>

        {/* Filter Area */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center text-gray-900">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2"></span>
            検索フィルター条件
          </h2>
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">対象日付</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 min-h-[44px] px-3 border"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">外注先所属企業</label>
              <select
                value={filterContractorId}
                onChange={(e) => setFilterContractorId(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 min-h-[44px] px-3 border"
              >
                <option value="">すべて（全外注先）</option>
                {contractors.map((c) => (
                  <option key={c.contractor_id} value={c.contractor_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md shadow-sm transition duration-150 min-h-[44px]"
              >
                検索実行
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterDate('2026-04-13');
                  setFilterContractorId('');
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-md transition duration-150 min-h-[44px]"
              >
                クリア
              </button>
            </div>
          </form>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600 text-sm">
            検索結果: <span className="font-bold text-gray-900 text-base">{attendanceRecords.length}</span> 件の打刻実績があります
          </p>
        </div>

        {/* Loading overlay */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 font-semibold">データを読み込み中...</p>
          </div>
        ) : attendanceRecords.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border-2 border-dashed border-gray-300">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-500 text-lg font-bold">指定された日付の打刻実績は見つかりませんでした。</p>
            <p className="text-gray-400 text-sm mt-1">別の検索フィルター条件を指定してください。</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Desktop Table Layout */}
            <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">作業員名</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先企業</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">打刻種別</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">打刻時間</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">エビデンス写真</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedRecords.map((record) => {
                    const pUrl = photoUrls.get(record.photo_object_id);
                    return (
                      <tr key={record.attendance_id} className="hover:bg-gray-50 transition duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{record.worker_name}</div>
                          <div className="text-xs text-gray-400">ID: {record.worker_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-700">{record.contractor_name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {record.punch_type === 'CLOCK_IN' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              出勤
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              退勤
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatTimeStr(record.clocked_at)}</div>
                          <div className="text-xs text-gray-400">{record.clocked_at.split('T')[0]}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {pUrl ? (
                            <button
                              onClick={() => setSelectedPhotoUrl(pUrl)}
                              className="focus:outline-none ring-2 ring-transparent hover:ring-blue-500 rounded transition duration-150"
                              title="写真をクリックして拡大"
                            >
                              <img
                                src={pUrl}
                                alt="打刻写真"
                                className="h-12 w-12 rounded object-cover shadow-sm border border-gray-200"
                              />
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">写真なし</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal(record)}
                            className="inline-flex items-center px-4 py-2 border border-blue-600 rounded text-sm font-bold text-blue-600 bg-white hover:bg-blue-50 transition min-h-[44px]"
                          >
                            修正
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Layout (SP Responsive) */}
            <div className="md:hidden space-y-4">
              {paginatedRecords.map((record) => {
                const pUrl = photoUrls.get(record.photo_object_id);
                return (
                  <div key={record.attendance_id} className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{record.worker_name}</h3>
                        <p className="text-xs text-gray-500">{record.contractor_name}</p>
                      </div>
                      {record.punch_type === 'CLOCK_IN' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          出勤
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          退勤
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400">打刻時間</p>
                        <p className="text-base font-extrabold text-gray-900">{formatTimeStr(record.clocked_at)}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {pUrl ? (
                          <button
                            onClick={() => setSelectedPhotoUrl(pUrl)}
                            className="focus:outline-none ring-2 ring-transparent active:ring-blue-500 rounded min-h-[44px] min-w-[44px] flex items-center justify-center"
                          >
                            <img
                              src={pUrl}
                              alt="打刻写真"
                              className="h-11 w-11 rounded object-cover border border-gray-200"
                            />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">写真なし</span>
                        )}
                        <button
                          onClick={() => openEditModal(record)}
                          className="bg-white border border-blue-600 hover:bg-blue-50 text-blue-600 font-bold py-2 px-4 rounded text-sm min-h-[44px] flex items-center"
                        >
                          修正
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  >
                    次へ
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{attendanceRecords.length}</span> 件中 {' '}
                      <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> から {' '}
                      <span className="font-semibold">{Math.min(currentPage * itemsPerPage, attendanceRecords.length)}</span> 件目を表示
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 min-h-[44px]"
                      >
                        <span className="sr-only">前へ</span>
                        &larr;
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 min-h-[44px] ${
                            currentPage === page
                              ? 'z-10 bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                              : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 min-h-[44px]"
                      >
                        <span className="sr-only">次へ</span>
                        &rarr;
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Photo Zoom */}
      {selectedPhotoUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">打刻現場証拠写真の拡大</h3>
              <button
                onClick={() => setSelectedPhotoUrl(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-2xl min-h-[44px] px-3"
              >
                &times;
              </button>
            </div>
            <div className="p-4 bg-gray-50 flex justify-center items-center overflow-auto max-h-[70vh]">
              <img
                src={selectedPhotoUrl}
                alt="拡大打刻写真"
                className="max-w-full max-h-[60vh] object-contain rounded shadow-md border border-gray-300"
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedPhotoUrl(null)}
                className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 px-6 rounded-md min-h-[44px]"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Punch Correction Form */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">打刻実績の代理修正登録</h3>
              <p className="text-xs text-gray-500 mt-1">
                対象作業員: <span className="font-bold text-gray-700">{editingRecord.worker_name} ({editingRecord.contractor_name})</span>
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* Time Fields */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">修正後の打刻日時</label>
                <input
                  type="datetime-local"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 min-h-[44px] px-3 border"
                />
              </div>

              {/* Punch Type Fields */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">打刻種別</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition min-h-[44px] ${
                    editType === 'CLOCK_IN'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="punch_type"
                      value="CLOCK_IN"
                      checked={editType === 'CLOCK_IN'}
                      onChange={() => setEditType('CLOCK_IN')}
                      className="sr-only"
                    />
                    <span>出勤</span>
                  </label>
                  <label className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition min-h-[44px] ${
                    editType === 'CLOCK_OUT'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="punch_type"
                      value="CLOCK_OUT"
                      checked={editType === 'CLOCK_OUT'}
                      onChange={() => setEditType('CLOCK_OUT')}
                      className="sr-only"
                    />
                    <span>退勤</span>
                  </label>
                </div>
              </div>

              {/* Correction Reason text area */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  修正理由 <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="（例：打刻エラーが発生したための代理修正等、具体的な理由を必須記述）"
                  value={editReason}
                  onChange={(e) => {
                    setEditReason(e.target.value);
                    if (e.target.value.trim()) setValidationError('');
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 p-3 border"
                />
                {validationError && (
                  <p className="text-red-600 text-xs font-semibold mt-1 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {validationError}
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setEditingRecord(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 px-6 rounded-md transition duration-150 min-h-[44px]"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveCorrection}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-md shadow-sm transition duration-150 min-h-[44px]"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AttendanceHistoryPage() {
  return (
    <AuthProvider>
      <AttendanceHistoryContent />
    </AuthProvider>
  );
}
