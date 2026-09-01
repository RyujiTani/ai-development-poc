"use client";

import React, { useState, useEffect } from 'react';
import { Contractor } from '../domain/types';
import { contractorSchema } from '../domain/contractorSchema';

interface ContractorFormProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  contractor: Contractor | null;
  onSave: (name: string, status: 'ACTIVE' | 'INACTIVE') => void;
  onCancel: () => void;
}

// trace: SCR-014-UI-004
export const ContractorForm: React.FC<ContractorFormProps> = ({
  isOpen,
  mode,
  contractor,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'EDIT' && contractor) {
        setName(contractor.name);
        setStatus(contractor.status);
      } else {
        setName('');
        setStatus('ACTIVE');
      }
      setError(null);
    }
  }, [isOpen, mode, contractor]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // trace: SCR-014-VL-001
    const validationResult = contractorSchema.safeParse({ name, status });
    if (!validationResult.success) {
      const fieldError = validationResult.error.flatten().fieldErrors.name?.[0];
      setError(fieldError || '入力内容が正しくありません');
      return;
    }

    onSave(name.trim(), status);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel}></div>

      {/* Modal panel positioning */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg w-full">
          
          <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold leading-6 text-gray-900">
                {mode === 'CREATE' ? '外注先企業 新規登録' : '外注先企業 情報編集'}
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-500 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full"
                onClick={onCancel}
              >
                <span className="sr-only">閉じる</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Fields Body */}
            <div className="bg-white px-6 py-6 space-y-5">
              {/* Name field */}
              <div>
                <label htmlFor="company-name" className="block text-sm font-bold text-gray-700 mb-1">
                  企業名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="company-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className={`block w-full rounded-md border shadow-sm px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                    error ? 'border-red-300 bg-red-50 text-red-900' : 'border-gray-300'
                  }`}
                  placeholder="例: 株式会社テスト興業"
                  autoComplete="off"
                />
                {error && (
                  <p className="mt-2 text-sm text-red-600 font-medium flex items-center" id="name-error">
                    <svg className="w-4 h-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              {/* Status Select */}
              <div>
                <label htmlFor="company-status" className="block text-sm font-bold text-gray-700 mb-2">
                  ステータス
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors ${
                    status === 'ACTIVE'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="status"
                      value="ACTIVE"
                      checked={status === 'ACTIVE'}
                      onChange={() => setStatus('ACTIVE')}
                      className="sr-only"
                    />
                    <span>有効 (ACTIVE)</span>
                  </label>
                  <label className={`flex items-center justify-center p-3 border rounded-md cursor-pointer transition-colors ${
                    status === 'INACTIVE'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="status"
                      value="INACTIVE"
                      checked={status === 'INACTIVE'}
                      onChange={() => setStatus('INACTIVE')}
                      className="sr-only"
                    />
                    <span>無効 (INACTIVE)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-reverse space-y-3">
              <button
                type="button"
                className="w-full sm:w-auto px-5 py-2.5 text-base sm:text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                onClick={onCancel}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 text-base sm:text-sm font-bold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              >
                保存
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
"
    },
    {