"use client";

import React, { useState } from 'react';
import { Contractor } from '../domain/types';

interface ContractorTableProps {
  contractors: Contractor[];
  onEdit: (contractor: Contractor) => void;
  onDelete: (contractorId: string) => void;
}

// trace: SCR-014-UI-001
export const ContractorTable: React.FC<ContractorTableProps> = ({
  contractors,
  onEdit,
  onDelete
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // trace: SCR-014-UI-005

  const totalPages = Math.ceil(contractors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContractors = contractors.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full">
      {/* PC / Tablet view: Table */}
      {/* trace: SCR-014-UI-006 */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                企業名
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                ステータス
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">
                登録日時
              </th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedContractors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  登録されている外注先企業はありません。
                </td>
              </tr>
            ) : (
              paginatedContractors.map((c) => (
                <tr key={c.contractor_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {c.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      c.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {c.status === 'ACTIVE' ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* trace: SCR-014-UI-003 */}
                    <button
                      onClick={() => onEdit(c)}
                      className="text-blue-600 hover:text-blue-900 mr-4 inline-flex items-center font-semibold"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => onDelete(c.contractor_id)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center font-semibold"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile view: Card stack */}
      {/* trace: SCR-014-UI-006 */}
      <div className="md:hidden space-y-4">
        {paginatedContractors.length === 0 ? (
          <div className="bg-white p-6 text-center text-sm text-gray-500 rounded-lg border border-gray-200">
            登録されている外注先企業はありません。
          </div>
        ) : (
          paginatedContractors.map((c) => (
            <div key={c.contractor_id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="text-base font-bold text-gray-900 leading-tight">
                  {c.name}
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  c.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {c.status === 'ACTIVE' ? '有効' : '無効'}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                登録日: {formatDate(c.created_at)}
              </div>
              <div className="flex justify-end pt-2 border-t border-gray-100 space-x-3">
                {/* trace: SCR-014-UI-003 */}
                {/* High contrast, large touch targets for mobile */}
                <button
                  onClick={() => onEdit(c)}
                  className="px-4 py-2 text-sm font-bold text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 active:bg-blue-100 min-h-[40px] flex items-center"
                >
                  編集
                </button>
                <button
                  onClick={() => onDelete(c.contractor_id)}
                  className="px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-md hover:bg-red-50 active:bg-red-100 min-h-[40px] flex items-center"
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination controls */}
      {/* trace: SCR-014-UI-005 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            全 <span className="font-semibold">{contractors.length}</span> 件中{' '}
            <span className="font-semibold">{startIndex + 1}</span>〜
            <span className="font-semibold">
              {Math.min(startIndex + itemsPerPage, contractors.length)}
            </span> 件表示
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] flex items-center"
            >
              前へ
            </button>
            <div className="hidden sm:flex space-x-1 items-center">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-md text-sm font-semibold min-h-[40px] min-w-[40px] ${
                      currentPage === pageNum
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] flex items-center"
            >
              次へ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
"
    },
    {