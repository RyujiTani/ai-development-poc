"use client";

import React from "react";
import { Contractor } from "../repository/contractorRepository";

interface ContractorListTableProps {
  contractors: Contractor[];
  onEdit: (contractor: Contractor) => void;
  onDelete: (contractor: Contractor) => void;
  currentPage: number;
  itemsPerPage: number;
}

export default function ContractorListTable({
  contractors,
  onEdit,
  onDelete,
  currentPage,
  itemsPerPage,
}: ContractorListTableProps) {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedContractors = contractors.slice(startIndex, startIndex + itemsPerPage);

  const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );

  const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <polyline points="3 6 5 3 21 3 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden" data-testid="contractor-table-container">
      {/* PC向けテーブル表示 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-sm font-bold text-slate-600">企業名</th>
              <th className="px-6 py-3 text-sm font-bold text-slate-600">ステータス</th>
              <th className="px-6 py-3 text-sm font-bold text-slate-600">登録日時</th>
              <th className="px-6 py-3 text-sm font-bold text-slate-600 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white" data-testid="contractor-table-body">
            {paginatedContractors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 font-medium">
                  登録されている外注先企業はありません。
                </td>
              </tr>
            ) : (
              paginatedContractors.map((contractor) => (
                <tr key={contractor.contractor_id} className="hover:bg-slate-50/50 transition-colors" data-testid={`contractor-row-${contractor.contractor_id}`}>
                  <td className="px-6 py-4 text-base font-bold text-slate-900" data-testid={`contractor-name-${contractor.contractor_id}`}>
                    {contractor.name}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {contractor.status === "ACTIVE" ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold shadow-sm" data-testid={`contractor-status-badge-${contractor.contractor_id}`}>
                        有効
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-bold shadow-sm" data-testid={`contractor-status-badge-${contractor.contractor_id}`}>
                        無効
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 font-mono">
                    {new Date(contractor.created_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-6 py-4 text-sm text-right space-x-3">
                    <button
                      onClick={() => onEdit(contractor)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 border border-slate-300 hover:border-slate-400 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                      style={{ minHeight: "36px" }}
                      data-testid={`edit-contractor-btn-${contractor.contractor_id}`}
                    >
                      <EditIcon />
                      <span>編集</span>
                    </button>
                    <button
                      onClick={() => onDelete(contractor)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                      style={{ minHeight: "36px" }}
                      data-testid={`delete-contractor-btn-${contractor.contractor_id}`}
                    >
                      <TrashIcon />
                      <span>削除</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* スマホ向けカード表示 */}
      <div className="md:hidden divide-y divide-slate-200" data-testid="contractor-mobile-list">
        {paginatedContractors.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium">
            登録されている外注先企業はありません。
          </div>
        ) : (
          paginatedContractors.map((contractor) => (
            <div key={contractor.contractor_id} className="p-5 space-y-4 hover:bg-slate-50/50" data-testid={`contractor-card-${contractor.contractor_id}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900" data-testid={`contractor-name-mobile-${contractor.contractor_id}`}>
                    {contractor.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    登録日: {new Date(contractor.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                <div>
                  {contractor.status === "ACTIVE" ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold shadow-sm">
                      有効
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-bold shadow-sm">
                      無効
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => onEdit(contractor)}
                  className="flex items-center justify-center space-x-1 px-4 py-2 border border-slate-300 bg-white rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                  style={{ minWidth: "80px", minHeight: "44px" }}
                  data-testid={`edit-contractor-mobile-btn-${contractor.contractor_id}`}
                >
                  <EditIcon />
                  <span>編集</span>
                </button>
                <button
                  onClick={() => onDelete(contractor)}
                  className="flex items-center justify-center space-x-1 px-4 py-2 border border-red-200 hover:border-red-300 bg-white rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 shadow-sm"
                  style={{ minWidth: "80px", minHeight: "44px" }}
                  data-testid={`delete-contractor-mobile-btn-${contractor.contractor_id}`}
                >
                  <TrashIcon />
                  <span>削除</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}