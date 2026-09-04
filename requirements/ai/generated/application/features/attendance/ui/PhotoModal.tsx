'use client';

import React, { useEffect, useState } from 'react';
import { GetPhotoBlobUseCase } from '../usecase/getPhotoBlobUseCase';
import { IndexedDBAttendanceRepository } from '../repository/attendanceRepository';

interface PhotoModalProps {
  photoObjectId: string;
  onClose: () => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({ photoObjectId, onClose }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url: string | null = null;
    let active = true;

    const fetchPhoto = async () => {
      try {
        const repo = new IndexedDBAttendanceRepository();
        const useCase = new GetPhotoBlobUseCase(repo);
        const result = await useCase.execute(photoObjectId);

        if (result.success && result.value && active) {
          url = URL.createObjectURL(result.value.blob);
          setImageUrl(url);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchPhoto();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [photoObjectId]);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 h-10 w-10 flex items-center justify-center transition cursor-pointer"
          aria-label="閉じる"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-bold text-gray-900 mb-4 pr-12">打刻写真拡大</h3>

        <div className="bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center min-h-[240px] sm:min-h-[320px]">
          {loading ? (
            <div className="text-center text-white">
              <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs text-gray-400">読み込み中...</p>
            </div>
          ) : imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="打刻写真拡大" className="max-w-full max-h-[60vh] object-contain" />
          ) : (
            <p className="text-sm text-gray-400">写真を取得できませんでした。</p>
          )}
        </div>
      </div>
    </div>
  );
};