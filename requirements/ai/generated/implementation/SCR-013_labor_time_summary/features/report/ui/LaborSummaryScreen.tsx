'use client';

import React, { useState, useEffect } from 'react';
import { LaborSummaryRow } from '../domain/types';
import { seedDatabase } from '@/lib/db/indexedDb';

export default function LaborSummaryScreen() {
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-04-07');
  const [unit, setUnit] = useState<'daily' | 'monthly'>('daily');
  const [records, setRecords] = useState<LaborSummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);

    if (!startDate) {
      setError('開始日を入力してください');
      setIsLoading(false);
      return;
    }
    if (!endDate) {
      setError('終了日を入力してください');
      setIsLoading(false);
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('終了日は開始日以降の日付を指定してください');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/labor-summary?start_date=${startDate}&end_date=${endDate}&unit=${unit}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'データの取得に失敗しました');
      }
      const data = await res.json();
      setRecords(data);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await seedDatabase();
      fetchSummary();
    };
    init();
  }, [unit]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSummary();
  };

  const handleDownloadCSV = () => {
    if (!startDate || !endDate) {
      setError('開始日と終了日を入力してください');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('終了日は開始日以降の日付を指定してください');
      return;
    }
    
    window.location.href = `/api/admin/labor-summary/csv?start_date=${startDate}&end_date=${endDate}&unit=${unit}`;
  };

  const totalPages = Math.ceil(records.length / itemsPerPage);
  const paginatedRecords = records.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">労働時間集計</h1>
          <p className="text-sm text-gray-500">外注作業員の実労働時間を日次・月次で集計・確認できます</p>
        </div>
        <button
          onClick={handleDownloadCSV}
          disabled={records.length === 0}
          className={`flex items-center justify-center gap-2 rounded px-4 py-2.5 font-semibold text-white shadow transition-all duration-200 ${
            records.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          CSVダウンロード
        </button>
      </div>

      <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded border border-gray-300 p-2.5 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded border border-gray-300 p-2.5 text-black focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">集計単位</label>
              <div className="flex rounded-md shadow-sm h-[46px] p-0.5 bg-gray-100">
                <button
                  type="button"
                  onClick={() => setUnit('daily')}
                  className={`flex-1 rounded-md text-sm font-medium transition ${
                    unit === 'daily'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  日次集計
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('monthly')}
                  className={`flex-1 rounded-md text-sm font-medium transition ${
                    unit === 'monthly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  月次集計
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {error ? (
              <p className="text-sm font-medium text-red-500" role="alert">{error}</p>
            ) : (
              <div />
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto min-w-[150px] rounded bg-blue-600 px-6 py-2.5 font-semibold text-white shadow hover:bg-blue-700 transition disabled:bg-blue-300"
            >
              {isLoading ? '集計中...' : '集計する'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-gray-500">データを集計しています...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="font-semibold text-lg mb-1">集計データがありません</p>
            <p className="text-sm">指定された期間および単位での打刻データが見つかりませんでした。</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">作業員名</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">外注先企業</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                      {unit === 'daily' ? '日付' : '対象月'}
                    </th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">実労働時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-black">
                  {paginatedRecords.map((rec) => (
                    <tr key={`${rec.workerId}_${rec.dateOrMonth}`} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium">{rec.workerName}</td>
                      <td className="px-6 py-4 text-gray-600">{rec.contractorName}</td>
                      <td className="px-6 py-4 text-gray-600">{rec.dateOrMonth}</td>
                      <td className="px-6 py-4 text-right font-semibold text-blue-600">
                        {rec.totalHours.toFixed(1)} 時間
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t p-4 bg-gray-50">
                <p className="text-sm text-gray-600">
                  全 <span className="font-semibold">{records.length}</span> 件中 {(currentPage - 1) * itemsPerPage + 1} 〜 {Math.min(currentPage * itemsPerPage, records.length)} 件表示
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white text-black"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white text-black"
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}