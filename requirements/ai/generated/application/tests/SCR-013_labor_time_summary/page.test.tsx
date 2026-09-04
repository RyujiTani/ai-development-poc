import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LaborSummaryPage from '../../app/(factory)/admin/labor-summary/page';
import { ToastProvider } from '../../components/ui/toast';

const mockReplace = vi.fn();
const mockPush = vi.fn();
const mockExecuteGetLaborSummary = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

// UseCase のモック
vi.mock('../../features/report/usecase/getLaborSummaryUseCase', () => {
  return {
    GetLaborSummaryUseCase: vi.fn().mockImplementation(() => {
      return {
        execute: mockExecuteGetLaborSummary,
      };
    }),
  };
});

describe('SCR-013: 労働時間集計画面のテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    global.URL.createObjectURL = vi.fn().mockReturnValue('mock-object-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <LaborSummaryPage />
      </ToastProvider>
    );
  };

  it('TST-013-UI-001: 労働時間集計用UI要素が正しくレンダリングされていること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetLaborSummary.mockResolvedValue({
      success: true,
      value: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('集計画面を初期化中...')).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/開始日/)).toBeInTheDocument();
    expect(screen.getByLabelText(/終了日/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '日次' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '月次' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '集計' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CSVダウンロード' })).toBeInTheDocument();
  });

  it('TST-013-VL-001: 開始日が空の場合にバリデーションエラーとなること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    mockExecuteGetLaborSummary.mockResolvedValue({
      success: true,
      value: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('集計画面を初期化中...')).not.toBeInTheDocument();
    });

    const startDateInput = screen.getByLabelText(/開始日/) as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: '' } });

    const calcBtn = screen.getByRole('button', { name: '集計' });
    fireEvent.click(calcBtn);

    await waitFor(() => {
      expect(screen.getByText('開始日は必須項目です。')).toBeInTheDocument();
    });
  });

  it('TST-013-VL-003: 未認証の状態でアクセスした際、管理者ログイン画面へリダイレクトされること', async () => {
    sessionStorage.clear(); // 未ログイン

    renderComponent();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    });
  });

  it('TST-013-FN-001: 労働時間の日次集計データが正しく一覧表示されること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    const mockSummary = [
      {
        id: 'w1-2026-04-13',
        worker_id: 'w1',
        worker_name: '作業員A',
        contractor_id: 'c1',
        contractor_name: '外注先A',
        period: '2026-04-13',
        total_working_hours: 8.5,
      },
    ];

    mockExecuteGetLaborSummary.mockResolvedValue({
      success: true,
      value: mockSummary,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('集計画面を初期化中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('作業員A')).toBeInTheDocument();
    expect(screen.getByText('外注先A')).toBeInTheDocument();
    expect(screen.getByText('2026-04-13')).toBeInTheDocument();
    expect(screen.getByText('8.50 時間')).toBeInTheDocument();
  });

  it('TST-013-FN-004: CSVダウンロードをクリックした際、適切にダウンロードイベントが実行されること', async () => {
    sessionStorage.setItem('user_id', 'u3333333');
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('display_name', '工場管理責任者');

    const mockSummary = [
      {
        id: 'w1-2026-04-13',
        worker_id: 'w1',
        worker_name: '作業員A',
        contractor_id: 'c1',
        contractor_name: '外注先A',
        period: '2026-04-13',
        total_working_hours: 8.5,
      },
    ];

    mockExecuteGetLaborSummary.mockResolvedValue({
      success: true,
      value: mockSummary,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText('集計画面を初期化中...')).not.toBeInTheDocument();
    });

    const mockClick = vi.fn();
    const mockSetAttribute = vi.fn();

    const dummyLink = {
      setAttribute: mockSetAttribute,
      style: {},
      click: mockClick,
    } as unknown as HTMLAnchorElement;

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return dummyLink;
      }
      return document.createElement(tagName);
    });
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    const downloadBtn = screen.getByRole('button', { name: 'CSVダウンロード' });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith('download', expect.stringContaining('.csv'));
    });
    expect(mockClick).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});