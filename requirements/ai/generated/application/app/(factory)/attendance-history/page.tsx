"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initDB } from '@/lib/db';
import { GetAttendanceHistoryUseCase, AttendanceHistoryItem } from '@/features/attendance/usecase/getAttendanceHistoryUseCase';
import { GetPhotoBlobUseCase } from '@/features/attendance/usecase/getPhotoBlobUseCase';
import { IndexedDBAttendanceRepository } from '@/features/attendance/repository/indexedDBAttendanceRepository';
import { CorrectPunchUseCase } from '@/features/attendance/usecase/correctPunchUseCase';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';

// Custom SVG Icons
const LayoutDashboard = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

const FileSpreadsheet = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M8 13h8" />
    <path d="M8 17h8" />
    <path d="M10 9h4" />
  </svg>
);

const Building2 = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);

const Users = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const Bell = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const LogOut = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const Menu = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const X = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const Plus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// 写真サムネイルの安全な Object URL 管理用サブコンポーネント
function ThumbnailImage({
  photoObjectId,
  attendanceRepository,
  onClick,
}: {
  photoObjectId: string;
  attendanceRepository: IndexedDBAttendanceRepository;
  onClick: () => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!photoObjectId) {
      setIsLoading(false);
      return;
    }

    let active = true;
    let url: string | null = null;

    const loadPhoto = async () => {
      try {
        const useCase = new GetPhotoBlobUseCase(attendanceRepository);
        const result = await useCase.execute(photoObjectId);
        if (result.success && active) {
          url = URL.createObjectURL(result.value);
          setImgUrl(url);
        }
      } catch (err) {
        console.error('Failed to load photo', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadPhoto();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photoObjectId, attendanceRepository]);

  if (isLoading) {
    return <div className="h-12 w-12 bg-gray-200 animate-pulse rounded" />;
  }

  if (!imgUrl) {
    return <span className="text-gray-400 text-xs">なし</span>;
  }

  return (
    <img
      src={imgUrl}
      alt="打刻証拠"
      className="h-12 w-12 object-cover rounded cursor-pointer border border-gray-200 hover:opacity-80 transition-opacity"
      onClick={onClick}
      data-testid={`thumbnail-${photoObjectId}`}
    />
  );
}

// 拡大写真モーダルコンポーネント
function EnlargedPhotoModal({
  photoObjectId,
  attendanceRepository,
  onClose,
}: {
  photoObjectId: string;
  attendanceRepository: IndexedDBAttendanceRepository;
  onClose: () => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    const loadPhoto = async () => {
      try {
        const useCase = new GetPhotoBlobUseCase(attendanceRepository);
        const result = await useCase.execute(photoObjectId);
        if (result.success && active) {
          url = URL.createObjectURL(result.value);
          setImgUrl(url);
        }
      } catch (err) {
        console.error('Failed to load enlarged photo', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadPhoto();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photoObjectId, attendanceRepository]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
      data-testid="enlarged-photo-modal"
    >
      <div
        className="relative bg-white p-2 rounded-lg max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-900 bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="閉じる"
          data-testid="close-modal-btn"
        >
          <X className="h-6 w-6" />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 text-sm">写真を読み込み中...</p>
          </div>
        ) : imgUrl ? (
          <img
            src={imgUrl}
            alt="拡大打刻証拠"
            className="max-w-full max-h-[80vh] object-contain rounded animate-fade-in"
            data-testid="enlarged-photo"
          />
        ) : (
          <p className="text-gray-500 p-8">写真データを読み込めませんでした。</p>
        )}
      </div>
    </div>
  );
}

export default function AttendanceHistoryPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // フィルタ状態
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedContractorId, setSelectedContractorId] = useState('');

  // 各種マスター・打刻履歴データ状態
  const [contractorsList, setContractorsList] = useState<any[]>([]);
  const [allWorkers, setAllWorkers] = useState<any[]>([]);
  const [punchRecords, setPunchRecords] = useState<AttendanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // モーダル・ポップアップ状態
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formType, setFormType] = useState<'NEW' | 'EDIT'>('NEW');

  // 手動打刻 / 修正フォーム状態
  const [editFormState, setEditFormState] = useState({
    attendanceId: '',
    workerId: '',
    contractorId: '',
    punchType: 'CLOCK_IN' as 'CLOCK_IN' | 'CLOCK_OUT',
    clockedAt: '',
    reason: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ページネーション用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const attendanceRepository = new IndexedDBAttendanceRepository();

  // YYYY-MM-DD フォーマット取得
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 認証と初期化
  useEffect(() => {
    const checkAuthAndInit = async () => {
      const userId = sessionStorage.getItem('user_id');
      const role = sessionStorage.getItem('role');

      if (!userId || role !== 'FACTORY_ADMIN') {
        logger.info('UNAUTHORIZED_ACCESS_REDIRECT', { path: '/attendance-history' });
        router.replace('/login');
        return;
      }

      setIsAuthenticated(true);
      const today = getTodayDateString();
      setSelectedDate(today);

      try {
        const db = await initDB();

        // 外注先企業マスターロード (ACTIVE のみ)
        const conTx = db.transaction('contractors', 'readonly');
        const contractors = await conTx.objectStore('contractors').getAll();
        await conTx.done;
        setContractorsList(contractors.filter((c: any) => c.status === 'ACTIVE'));

        // 作業員マスターロード (ACTIVE のみ)
        const wrkTx = db.transaction('workers', 'readonly');
        const workers = await wrkTx.objectStore('workers').getAll();
        await wrkTx.done;
        setAllWorkers(workers.filter((w: any) => w.status === 'ACTIVE'));

        // 打刻履歴ロード
        await loadHistory(today, '');
      } catch (err) {
        logger.error('INIT_ATTENDANCE_HISTORY_ERROR', err);
        toast.error('マスタデータの取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndInit();
  }, [router]);

  // 打刻履歴ロード関数
  const loadHistory = async (date: string = selectedDate, contractorId: string = selectedContractorId) => {
    try {
      const useCase = new GetAttendanceHistoryUseCase();
      const result = await useCase.execute({
        date: date || undefined,
        contractorId: contractorId || undefined,
      });

      if (result.success) {
        setPunchRecords(result.value);
        setCurrentPage(1);
      } else {
        toast.error('打刻履歴の取得に失敗しました。');
      }
    } catch (err) {
      logger.error('LOAD_HISTORY_ERROR', err);
      toast.error('打刻履歴の取得中にエラーが発生しました。');
    }
  };

  // フィルタ変更時の動作
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedDate(val);
    loadHistory(val, selectedContractorId);
    logger.info('FILTER_DATE_CHANGED', { date: val });
  };

  const handleContractorFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedContractorId(val);
    loadHistory(selectedDate, val);
    logger.info('FILTER_CONTRACTOR_CHANGED', { contractor_id: val });
  };

  const handleLogout = () => {
    logger.info('ADMIN_LOGOUT_EVENT', { user_id: sessionStorage.getItem('user_id') });
    sessionStorage.removeItem('user_id');
    sessionStorage.removeItem('role');
    router.push('/login');
  };

  // ISO を YYYY-MM-DDTHH:MM に変換するヘルパー
  const formatISOToDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  // フォーム起動：新規手動登録
  const openNewForm = () => {
    setFormType('NEW');
    setFormErrors({});
    const nowLocal = formatISOToDateTimeLocal(new Date().toISOString());
    setEditFormState({
      attendanceId: '',
      workerId: '',
      contractorId: selectedContractorId || '', // フィルタが効いている場合は初期値を合わせる
      punchType: 'CLOCK_IN',
      clockedAt: nowLocal,
      reason: '',
    });
    setIsFormModalOpen(true);
    logger.info('OPEN_MANUAL_PUNCH_FORM_NEW');
  };

  // フォーム起動：既存修正
  const openEditForm = (item: AttendanceHistoryItem) => {
    setFormType('EDIT');
    setFormErrors({});
    setEditFormState({
      attendanceId: item.attendance_id,
      workerId: item.worker_id,
      contractorId: item.contractor_id,
      punchType: item.punch_type,
      clockedAt: formatISOToDateTimeLocal(item.clocked_at),
      reason: '', // 修正理由は必須、毎回都度入力
    });
    setIsFormModalOpen(true);
    logger.info('OPEN_MANUAL_PUNCH_FORM_EDIT', { attendance_id: item.attendance_id });
  };

  // フォーム値の変更ハンドラ
  const handleFormChange = (key: string, value: string) => {
    setEditFormState((prev) => {
      const updated = { ...prev, [key]: value };
      // 外注先企業が変更された場合は、作業員選択をリセット
      if (key === 'contractorId') {
        updated.workerId = '';
      }
      return updated;
    });
    // エラークリア
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // フォーム送信
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (formType === 'NEW' && !editFormState.contractorId) {
      errors.contractorId = '外注先企業を選択してください。';
    }
    if (!editFormState.workerId) {
      errors.workerId = '作業員を選択してください。';
    }
    if (!editFormState.clockedAt) {
      errors.clockedAt = '打刻日時を入力してください。';
    }
    if (!editFormState.reason || !editFormState.reason.trim()) {
      errors.reason = '理由を入力してください。';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const useCase = new CorrectPunchUseCase(attendanceRepository);
      const isoClockedAt = new Date(editFormState.clockedAt).toISOString();

      const result = await useCase.execute({
        attendanceId: formType === 'EDIT' ? editFormState.attendanceId : undefined,
        workerId: editFormState.workerId,
        contractorId: editFormState.contractorId,
        punchType: editFormState.punchType,
        clockedAt: isoClockedAt,
        reason: editFormState.reason,
        correctedBy: sessionStorage.getItem('user_id') || 'system',
        isAdmin: true,
      });

      if (result.success) {
        toast.success(formType === 'EDIT' ? '打刻を修正しました。' : '手動打刻を登録しました。');
        setIsFormModalOpen(false);
        await loadHistory();
      } else if ('error' in result) {
        toast.error(result.error.message);
      }
    } catch (err) {
      logger.error('SAVE_MANUAL_PUNCH_ERROR', err);
      toast.error('保存処理中にエラーが発生しました。');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // ページネーション
  const totalPages = Math.ceil(punchRecords.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRecords = punchRecords.slice(indexOfFirstItem, indexOfLastItem);

  // フォーム用：選択された企業に属するアクティブな作業員のみを抽出
  const filteredWorkersForForm = allWorkers.filter(
    (w) => w.contractor_id === editFormState.contractorId
  );

  const navItems = [
    { name: '総合ダッシュボード', path: '/dashboard', icon: LayoutDashboard },
    { name: '打刻履歴確認', path: '/attendance-history', icon: Bell },
    { name: '労働時間集計', path: '/labor-summary', icon: FileSpreadsheet },
    { name: '外注先企業登録', path: '/contractors', icon: Building2 },
    { name: '管理者ユーザー登録', path: '/admin-users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* モバイルヘッダー */}
      <header className="bg-indigo-950 text-white px-4 py-4 flex items-center justify-between md:hidden shadow-md">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-indigo-400" />
          <span className="font-bold text-lg tracking-wider">工場管理者ポータル</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1 rounded-md hover:bg-indigo-900 focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="メニューを開閉"
          data-testid="mobile-menu-toggle"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* モバイルドロワーメニュー */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden" data-testid="mobile-sidebar">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-indigo-950 text-white pt-5 pb-4">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center px-4 mb-6">
              <LayoutDashboard className="h-8 w-8 text-indigo-400 mr-2" />
              <span className="font-bold text-xl tracking-wider">管理者メニュー</span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push(item.path);
                  }}
                  className={`group flex items-center px-4 py-3 text-base font-bold rounded-md w-full min-h-[44px] transition-colors ${
                    item.path === '/attendance-history' ? 'bg-indigo-900 text-white' : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                  }`}
                  data-testid={`mobile-nav-link-${item.path}`}
                >
                  <item.icon className="mr-4 h-6 w-6 text-indigo-300" />
                  {item.name}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="group flex items-center px-4 py-3 text-base font-bold rounded-md w-full min-h-[44px] text-red-300 hover:bg-red-950 hover:text-red-100 transition-colors mt-8"
                data-testid="mobile-logout-btn"
              >
                <LogOut className="mr-4 h-6 w-6 text-red-400" />
                ログアウト
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* デスクトップサイドバー */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-indigo-950 text-white min-h-screen p-4 flex-shrink-0 shadow-xl" data-testid="desktop-sidebar">
        <div className="flex items-center gap-2 mb-8 px-2 py-3 border-b border-indigo-900">
          <LayoutDashboard className="h-8 w-8 text-indigo-400" />
          <div>
            <h1 className="font-extrabold text-lg tracking-wider">工場管理者ポータル</h1>
            <p className="text-xs text-indigo-300 font-medium">勤怠・配置管理</p>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => router.push(item.path)}
              className={`flex items-center px-4 py-3 text-sm font-bold rounded-lg w-full transition-all duration-150 ${
                item.path === '/attendance-history'
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
              }`}
              data-testid={`desktop-nav-link-${item.path}`}
            >
              <item.icon className="mr-3 h-5 w-5 text-indigo-300" />
              {item.name}
            </button>
          ))}
        </nav>
        <div className="pt-4 border-t border-indigo-900 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-3 text-sm font-bold rounded-lg w-full text-red-300 hover:bg-red-950 hover:text-red-100 transition-all duration-150"
            data-testid="logout-btn"
          >
            <LogOut className="mr-3 h-5 w-5 text-red-400" />
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ領域 */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 pb-5 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 md:text-3xl">打刻履歴確認</h2>
            <p className="text-sm text-gray-500 mt-1">外注作業員の日別・会社別打刻実績の確認と修正管理を行います。</p>
          </div>
          <button
            onClick={openNewForm}
            className="flex items-center justify-center gap-2 h-12 px-5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 min-h-[44px]"
            data-testid="manual-punch-register-btn"
          >
            <Plus className="h-5 w-5" />
            <span>手動打刻登録</span>
          </button>
        </div>

        {/* フィルタ領域 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6 flex flex-col sm:flex-row gap-6 items-end">
          <div className="w-full sm:w-1/3">
            <label htmlFor="dateFilter" className="block text-sm font-bold text-gray-700 mb-2">
              対象日付
            </label>
            <input
              id="dateFilter"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
              data-testid="date-filter-input"
            />
          </div>

          <div className="w-full sm:w-1/3">
            <label htmlFor="contractorFilter" className="block text-sm font-bold text-gray-700 mb-2">
              外注先企業
            </label>
            <select
              id="contractorFilter"
              value={selectedContractorId}
              onChange={handleContractorFilterChange}
              className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px] bg-white"
              data-testid="contractor-filter-select"
            >
              <option value="">すべて表示</option>
              {contractorsList.map((con) => (
                <option key={con.contractor_id} value={con.contractor_id}>
                  {con.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-500 font-mono mb-3 sm:mb-0 ml-auto self-start sm:self-end">
            該当件数: {punchRecords.length} 件
          </div>
        </div>

        {/* 一覧テーブル */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20" data-testid="loading-indicator">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {punchRecords.length === 0 ? (
              <div className="p-16 text-center text-gray-500 font-medium" data-testid="no-records-msg">
                指定された条件に一致する打刻履歴はありません。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">作業員名</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">外注先企業</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">打刻区分</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">打刻時刻</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">証拠写真</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {currentRecords.map((item) => (
                      <tr key={item.attendance_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {item.worker_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.contractor_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              item.punch_type === 'CLOCK_IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.punch_type === 'CLOCK_IN' ? '出勤' : '退勤'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {new Date(item.clocked_at).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <ThumbnailImage
                            photoObjectId={item.photo_object_id}
                            attendanceRepository={attendanceRepository}
                            onClick={() => setActivePhotoId(item.photo_object_id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditForm(item)}
                            className="text-indigo-600 hover:text-indigo-900 font-bold px-3 py-1.5 rounded hover:bg-indigo-50 transition-colors min-h-[36px]"
                            data-testid={`edit-btn-${item.attendance_id}`}
                          >
                            修正
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ページネーションUI */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex h-10 px-4 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  data-testid="prev-page-btn"
                >
                  前へ
                </button>
                <span className="text-sm text-gray-700 font-mono">
                  {currentPage} / {totalPages} ページ
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex h-10 px-4 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
                  data-testid="next-page-btn"
                >
                  次へ
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 拡大写真モーダル */}
      {activePhotoId && (
        <EnlargedPhotoModal
          photoObjectId={activePhotoId}
          attendanceRepository={attendanceRepository}
          onClose={() => setActivePhotoId(null)}
        />
      )}

      {/* 手動打刻登録 / 修正モーダル */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" data-testid="form-modal">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-indigo-950 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold" data-testid="form-modal-title">
                {formType === 'NEW' ? '手動打刻登録' : '打刻履歴修正'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-indigo-200 hover:text-white p-1 min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* 外注先企業選択 (新規のみ可能、編集時は固定) */}
              <div className="flex flex-col">
                <label htmlFor="modalContractor" className="block text-sm font-bold text-gray-700 mb-1.5">
                  外注先企業 <span className="text-red-500 font-normal">(必須)</span>
                </label>
                <select
                  id="modalContractor"
                  value={editFormState.contractorId}
                  onChange={(e) => handleFormChange('contractorId', e.target.value)}
                  disabled={formType === 'EDIT'}
                  className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px] bg-white disabled:bg-gray-100 disabled:text-gray-500"
                  data-testid="form-contractor-select"
                >
                  <option value="">企業を選択してください</option>
                  {contractorsList.map((con) => (
                    <option key={con.contractor_id} value={con.contractor_id}>
                      {con.name}
                    </option>
                  ))}
                </select>
                {formErrors.contractorId && (
                  <p className="mt-1 text-sm text-red-600" data-testid="form-contractor-error">
                    {formErrors.contractorId}
                  </p>
                )}
              </div>

              {/* 作業員選択 (新規のみ可能、編集時は固定) */}
              <div className="flex flex-col">
                <label htmlFor="modalWorker" className="block text-sm font-bold text-gray-700 mb-1.5">
                  作業員 <span className="text-red-500 font-normal">(必須)</span>
                </label>
                <select
                  id="modalWorker"
                  value={editFormState.workerId}
                  onChange={(e) => handleFormChange('workerId', e.target.value)}
                  disabled={formType === 'EDIT' || !editFormState.contractorId}
                  className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px] bg-white disabled:bg-gray-100 disabled:text-gray-500"
                  data-testid="form-worker-select"
                >
                  <option value="">作業員を選択してください</option>
                  {filteredWorkersForForm.map((worker) => (
                    <option key={worker.worker_id} value={worker.worker_id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
                {formErrors.workerId && (
                  <p className="mt-1 text-sm text-red-600" data-testid="form-worker-error">
                    {formErrors.workerId}
                  </p>
                )}
              </div>

              {/* 打刻種別 */}
              <div className="flex flex-col">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  打刻種別 <span className="text-red-500 font-normal">(必須)</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex items-center justify-center gap-3 cursor-pointer border-2 rounded-lg p-3 min-h-[44px] select-none hover:bg-gray-50 transition-colors ${
                    editFormState.punchType === 'CLOCK_IN' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="formPunchType"
                      value="CLOCK_IN"
                      checked={editFormState.punchType === 'CLOCK_IN'}
                      onChange={() => handleFormChange('punchType', 'CLOCK_IN')}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold">出勤</span>
                  </label>
                  <label className={`flex items-center justify-center gap-3 cursor-pointer border-2 rounded-lg p-3 min-h-[44px] select-none hover:bg-gray-50 transition-colors ${
                    editFormState.punchType === 'CLOCK_OUT' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="formPunchType"
                      value="CLOCK_OUT"
                      checked={editFormState.punchType === 'CLOCK_OUT'}
                      onChange={() => handleFormChange('punchType', 'CLOCK_OUT')}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold">退勤</span>
                  </label>
                </div>
              </div>

              {/* 打刻日時 */}
              <div className="flex flex-col">
                <label htmlFor="modalClockedAt" className="block text-sm font-bold text-gray-700 mb-1.5">
                  打刻日時 <span className="text-red-500 font-normal">(必須)</span>
                </label>
                <input
                  id="modalClockedAt"
                  type="datetime-local"
                  value={editFormState.clockedAt}
                  onChange={(e) => handleFormChange('clockedAt', e.target.value)}
                  className="block h-12 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[44px]"
                  data-testid="form-clocked-at-input"
                />
                {formErrors.clockedAt && (
                  <p className="mt-1 text-sm text-red-600" data-testid="form-clocked-at-error">
                    {formErrors.clockedAt}
                  </p>
                )}
              </div>

              {/* 登録・修正理由 */}
              <div className="flex flex-col">
                <label htmlFor="modalReason" className="block text-sm font-bold text-gray-700 mb-1.5">
                  {formType === 'NEW' ? '手動登録理由' : '修正理由'} <span className="text-red-500 font-normal">(必須)</span>
                </label>
                <textarea
                  id="modalReason"
                  rows={4}
                  value={editFormState.reason}
                  onChange={(e) => handleFormChange('reason', e.target.value)}
                  placeholder="例: 出席打刻を失念したため補正登録します。"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm min-h-[88px]"
                  data-testid="reason-textarea"
                />
                {formErrors.reason && (
                  <p className="mt-1 text-sm text-red-600" data-testid="form-reason-error">
                    {formErrors.reason}
                  </p>
                )}
              </div>

              {/* アクションボタン */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 h-12 rounded-md border border-gray-300 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center min-h-[44px]"
                  data-testid="form-cancel-btn"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 h-12 rounded-md bg-indigo-600 text-base font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 flex items-center justify-center min-h-[44px]"
                  data-testid="form-submit-btn"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}