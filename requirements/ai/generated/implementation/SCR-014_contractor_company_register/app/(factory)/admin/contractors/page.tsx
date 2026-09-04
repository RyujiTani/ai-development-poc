'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Contractor, Status } from '../../../../features/contractor/domain/contractor';
import { IndexedDBContractorRepository } from '../../../../features/contractor/repository/indexedDBContractorRepository';
import { ContractorUsecase } from '../../../../features/contractor/usecase/contractorUsecase';

// UI要素の最小タップサイズ(44px)をCSSとして担保
const TOUCH_TARGET_STYLE = { minWidth: '44px', minHeight: '44px' };

export default function ContractorCompanyRegisterPage() {
  const router = useRouter();

  // レポジトリとユースケースの初期化
  const usecase = useMemo(() => {
    const repository = new IndexedDBContractorRepository();
    return new ContractorUsecase(repository);
  }, []);

  // 認証 & ロール状態管理
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ displayName: string; role: string } | null>(null);

  // データ & UI表示状態
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // フォーム編集ダイアログ状態
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formId, setFormId] = useState<string | null>(null); // null = 新規登録, string = 編集
  const [formName, setFormName] = useState<string>('');
  const [formStatus, setFormStatus] = useState<Status>('ACTIVE');
  const [formValidationError, setFormValidationError] = useState<string | null>(null);

  // トースト通知メッセージ
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ページネーション状態
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // トースト表示タイマー用
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // 認証チェック & 初期ロード
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionStr = sessionStorage.getItem('mock_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session && session.role === 'FACTORY_ADMIN') {
            setIsAuthenticated(true);
            setCurrentUser({
              displayName: session.displayName || '管理者',
              role: session.role,
            });
          } else {
            // 一般ユーザーまたは不正ロール
            setIsAuthenticated(false);
            router.push('/admin/login');
          }
        } catch (e) {
          setIsAuthenticated(false);
          router.push('/admin/login');
        }
      } else {
        // 未ログイン
        setIsAuthenticated(false);
        router.push('/admin/login');
      }
    }
  }, [router]);

  // データ取得処理
  const loadContractors = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await usecase.getContractors();
      // 作成日時降順で表示
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setContractors(list);
    } catch (err: any) {
      setErrorMsg(err.message || 'データ取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [usecase]);

  useEffect(() => {
    if (isAuthenticated) {
      loadContractors();
    }
  }, [isAuthenticated, loadContractors]);

  // モック用の簡易ログイン支援機能（テスト環境や未認証時でもボタン一発で検証できるようアシスト）
  const handleDemoLogin = () => {
    if (typeof window !== 'undefined') {
      const demoSession = {
        userId: 'demo-admin-id',
        displayName: 'デモ工場管理者',
        role: 'FACTORY_ADMIN',
        contractorId: null,
      };
      sessionStorage.setItem('mock_session', JSON.stringify(demoSession));
      setIsAuthenticated(true);
      setCurrentUser({
        displayName: demoSession.displayName,
        role: demoSession.role,
      });
    }
  };

  // 新規登録フォームを開く
  const handleOpenCreate = () => {
    setFormId(null);
    setFormName('');
    setFormStatus('ACTIVE');
    setFormValidationError(null);
    setIsFormOpen(true);
  };

  // 編集フォームを開く
  const handleOpenEdit = (contractor: Contractor) => {
    setFormId(contractor.contractor_id);
    setFormName(contractor.name);
    setFormStatus(contractor.status);
    setFormValidationError(null);
    setIsFormOpen(true);
  };

  // 保存処理
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormValidationError(null);

    const trimmed = formName ? formName.trim() : '';
    if (!trimmed) {
      setFormValidationError('企業名は必須入力です');
      return;
    }

    try {
      if (formId) {
        // 編集保存
        await usecase.updateContractor(formId, trimmed, formStatus);
        showToast('外注先企業を更新しました');
      } else {
        // 新規追加
        await usecase.createContractor(trimmed);
        showToast('外注先企業を登録しました');
      }
      setIsFormOpen(false);
      loadContractors();
    } catch (err: any) {
      setFormValidationError(err.message || '保存に失敗しました');
    }
  };

  // 削除処理
  const handleDelete = async (contractor: Contractor) => {
    const confirmMessage = `外注先企業「${contractor.name}」を削除しますか？\n（紐づく作業員等のデータ整合性については注意してください）`;
    if (window.confirm(confirmMessage)) {
      try {
        await usecase.deleteContractor(contractor.contractor_id);
        showToast('外注先企業を削除しました');
        loadContractors();
        // 削除後に現在のページが空になった場合の補正
        const updatedTotal = contractors.length - 1;
        const maxPage = Math.max(1, Math.ceil(updatedTotal / itemsPerPage));
        if (currentPage > maxPage) {
          setCurrentPage(maxPage);
        }
      } catch (err: any) {
        alert(err.message || '削除に失敗しました');
      }
    }
  };

  // ログアウト処理
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mock_session');
    }
    setIsAuthenticated(false);
    router.push('/admin/login');
  };

  // ページネーション計算
  const paginatedContractors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return contractors.slice(startIndex, startIndex + itemsPerPage);
  }, [contractors, currentPage]);

  const totalPages = Math.max(1, Math.ceil(contractors.length / itemsPerPage));

  // 未ログイン時のインターセプタUI
  if (isAuthenticated === false) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6 text-center">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full border border-gray-100">
          <svg className="w-16 h-16 text-yellow-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900 mb-2">管理者認証が必要です</h2>
          <p className="text-gray-600 text-sm mb-6">
            外注先企業登録画面へのアクセスには工場管理者権限でのログインが必要です。
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/admin/login')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-4 focus:ring-blue-200"
              style={TOUCH_TARGET_STYLE}
            >
              管理者ログイン画面へ
            </button>
            <button
              onClick={handleDemoLogin}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-4 focus:ring-emerald-200"
              style={TOUCH_TARGET_STYLE}
            >
              【検証用】工場管理者としてデモログイン
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading && contractors.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 font-medium">読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* ヘッダーエリア */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
              FACTORY PORTAL
            </div>
            <h1 className="text-lg font-bold text-gray-900 truncate">
              外注先企業管理
            </h1>
          </div>
          {currentUser && (
            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline-block text-sm text-gray-600">
                ログイン中: <strong className="text-gray-900 font-semibold">{currentUser.displayName}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 px-3 rounded-lg transition-colors border border-gray-300"
                style={TOUCH_TARGET_STYLE}
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      {/* メインレイアウト */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* トースト表示 */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white px-5 py-3 rounded-lg shadow-xl flex items-center space-x-3 transition-opacity duration-300">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        )}

        {/* コントロールヘッダー */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">登録外注先企業一覧</h2>
            <p className="text-gray-600 text-sm mt-1">
              登録済みの外注先企業を一覧・管理できます。新規登録、企業名編集、稼働状況(ステータス)変更が可能です。
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 focus:ring-4 focus:ring-blue-100"
            style={TOUCH_TARGET_STYLE}
            id="btn-create-new"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新規登録</span>
          </button>
        </div>

        {/* エラーメッセージ表示 */}
        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md mb-6">
            <p className="text-red-700 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* リスト ＆ テーブルコンテナ */}
        {contractors.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900 mb-1">外注先企業が登録されていません</h3>
            <p className="text-gray-500 text-sm mb-6">「新規登録」ボタンから最初の外注先企業を追加してください。</p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium px-4 py-2 rounded-lg transition-colors"
              style={TOUCH_TARGET_STYLE}
            >
              <span>新規企業を登録</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PC・タブレット表示用のテーブルレイアウト */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      企業名
                    </th>
                    <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      登録日時
                    </th>
                    <th scope="col" className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      更新日時
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {paginatedContractors.map((c) => (
                    <tr key={c.contractor_id} className="hover:bg-gray-55 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-950">
                        {c.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            c.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {c.status === 'ACTIVE' ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                        {new Date(c.created_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                        {new Date(c.updated_at).toLocaleString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3.5 py-2 rounded-lg border border-blue-200 transition-colors inline-flex items-center space-x-1"
                          style={TOUCH_TARGET_STYLE}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>編集</span>
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-2 rounded-lg border border-red-200 transition-colors inline-flex items-center space-x-1"
                          style={TOUCH_TARGET_STYLE}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>削除</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* モバイル表示用のカードレイアウト (レスポンシブWebデザイン) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {paginatedContractors.map((c) => (
                <div key={c.contractor_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 text-base">{c.name}</h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {c.status === 'ACTIVE' ? '有効' : '無効'}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-500 mb-4">
                      <div>
                        <span className="font-semibold text-gray-600">登録日時:</span>{' '}
                        {new Date(c.created_at).toLocaleString('ja-JP')}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-600">更新日時:</span>{' '}
                        {new Date(c.updated_at).toLocaleString('ja-JP')}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg border border-blue-200 text-center font-medium text-sm transition-colors"
                      style={TOUCH_TARGET_STYLE}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg border border-red-200 text-center font-medium text-sm transition-colors"
                      style={TOUCH_TARGET_STYLE}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ページネーションコントロール */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-white border border-gray-200 rounded-xl px-4 py-3 sm:px-6 shadow-sm">
                <div className="text-sm text-gray-700">
                  全 <span className="font-semibold">{contractors.length}</span> 件中、
                  <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span>〜
                  <span className="font-semibold">
                    {Math.min(currentPage * itemsPerPage, contractors.length)}
                  </span> 件を表示
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                    }`}
                    style={TOUCH_TARGET_STYLE}
                  >
                    前へ
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                        currentPage === i + 1
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                      }`}
                      style={TOUCH_TARGET_STYLE}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                    }`}
                    style={TOUCH_TARGET_STYLE}
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 登録・編集フォーム（モーダルダイアログ） */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-55 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {formId ? '外注先企業の編集' : '外注先企業の新規登録'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-lg transition-colors"
                style={TOUCH_TARGET_STYLE}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* 企業名入力欄 */}
              <div>
                <label htmlFor="company-name" className="block text-sm font-bold text-gray-700 mb-1">
                  企業名 <span className="text-red-500 font-normal text-xs">*必須</span>
                </label>
                <input
                  type="text"
                  id="company-name"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (e.target.value.trim()) setFormValidationError(null);
                  }}
                  className={`w-full border rounded-lg px-3.5 py-3 text-base focus:ring-4 focus:outline-none transition-shadow ${
                    formValidationError
                      ? 'border-red-500 focus:ring-red-100'
                      : 'border-gray-300 focus:ring-blue-100 focus:border-blue-500'
                  }`}
                  placeholder="例: 株式会社サンプル建設"
                  style={{ minHeight: '44px' }}
                />
                {formValidationError && (
                  <p className="text-red-600 text-xs mt-1.5 font-medium flex items-center space-x-1" id="val-error-name">
                    <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{formValidationError}</span>
                  </p>
                )}
              </div>

              {/* ステータス（編集時のみ選択可能、新規時はACTIVE固定） */}
              {formId && (
                <div>
                  <label htmlFor="company-status" className="block text-sm font-bold text-gray-700 mb-1">
                    ステータス
                  </label>
                  <select
                    id="company-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as Status)}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-3 text-base focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-shadow"
                    style={{ minHeight: '44px' }}
                  >
                    <option value="ACTIVE">有効</option>
                    <option value="INACTIVE">無効</option>
                  </select>
                  <p className="text-gray-500 text-xs mt-1">
                    無効に設定すると、この企業に所属する作業員の打刻機能が制限されます。
                  </p>
                </div>
              )}

              {/* 下部アクションボタン */}
              <div className="flex space-x-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 bg-white hover:bg-gray-55 text-gray-700 border border-gray-300 font-semibold py-3 px-4 rounded-lg transition-colors"
                  style={TOUCH_TARGET_STYLE}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors focus:ring-4 focus:ring-blue-100"
                  style={TOUCH_TARGET_STYLE}
                  id="btn-save-submit"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}