import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Page from '@/app/(factory)/labor-summary/page';
import { GetLaborSummaryUseCase } from '@/features/report/usecase/getLaborSummaryUseCase';

// router のモック
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
      replace: mockReplace,
    };
  },
}));

// UseCase のモックの基本宣言
vi.mock('@/features/report/usecase/getLaborSummaryUseCase', () => {
  return {
    GetLaborSummaryUseCase: vi.fn(),
  };
});

describe('LaborSummaryPage (SCR-013_labor_time_summary)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // 毎テストの開始前に GetLaborSummaryUseCase のモックを正常系のデフォルト動作にリセットする
    vi.mocked(GetLaborSummaryUseCase).mockImplementation(() => {
      return {
        execute: vi.fn().mockResolvedValue({
          success: true,
          value: [
            {
              worker_id: 'wrk-001',
              worker_name: '山田 太郎',
              contractor_id: 'con-001',
              contractor_name: '第一工業',
              period: '2026-04-01',
              working_hours: 8.5,
            },
          ],
        }),
      } as any;
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('FACTORY_ADMIN以外のロール（または未ログイン）の場合は、ログイン画面へリダイレクトされること', async () => {
    sessionStorage.setItem('role', 'CONTRACTOR_MANAGER');
    sessionStorage.setItem('user_id', 'usr-001');

    render(<Page />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('FACTORY_ADMINロールでログイン済みの場合は正しく描画され、初期集計が実行されること', async () => {
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('user_id', 'admin-001');

    render(<Page />);

    expect(screen.getByRole('heading', { name: '労働時間集計' })).toBeInTheDocument();
    expect(screen.getByTestId('start-date-input')).toBeInTheDocument();
    expect(screen.getByTestId('end-date-input')).toBeInTheDocument();

    // 初期データがテーブルに描画されるのを待つ
    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByText('第一工業')).toBeInTheDocument();
      expect(screen.getByText('2026-04-01')).toBeInTheDocument();
      expect(screen.getByText('8.50 時間')).toBeInTheDocument();
    });
  });

  it('集計単位に「月次」を選択して「集計」ボタンを押下すると、年月単位の労働時間が正しく表示されること', async () => {
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('user_id', 'admin-001');

    const mockExecute = vi.fn().mockResolvedValue({
      success: true,
      value: [
        {
          worker_id: 'wrk-001',
          worker_name: '山田 太郎',
          contractor_id: 'con-001',
          contractor_name: '第一工業',
          period: '2026-04',
          working_hours: 155.0,
        },
      ],
    });

    vi.mocked(GetLaborSummaryUseCase).mockImplementation(() => {
      return { execute: mockExecute } as any;
    });

    render(<Page />);

    // 「月次」を選択
    const selectUnit = screen.getByTestId('summary-unit-select') as HTMLSelectElement;
    fireEvent.change(selectUnit, { target: { value: 'monthly' } });

    // 「集計」ボタン押下
    const calculateBtn = screen.getByTestId('calculate-btn');
    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
      expect(screen.getByText('2026-04')).toBeInTheDocument();
      expect(screen.getByText('155.00 時間')).toBeInTheDocument();
    });
  });

  it('開始日が未入力の場合は、バリデーションエラーが発生し計算リクエストが送信されないこと', async () => {
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('user_id', 'admin-001');

    const mockExecute = vi.fn().mockResolvedValue({
      success: true,
      value: [],
    });
    vi.mocked(GetLaborSummaryUseCase).mockImplementation(() => {
      return { execute: mockExecute } as any;
    });

    render(<Page />);

    // 初期ロードを待つ
    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalled();
    });
    mockExecute.mockClear();

    // 開始日を空にする
    const startDateInput = screen.getByTestId('start-date-input') as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: '' } });

    const calculateBtn = screen.getByTestId('calculate-btn');
    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(screen.getByText('開始日を入力してください')).toBeInTheDocument();
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  it('終了日が開日より前の日付の場合は、バリデーションエラーが発生すること', async () => {
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('user_id', 'admin-001');

    const mockExecute = vi.fn().mockResolvedValue({
      success: true,
      value: [],
    });
    vi.mocked(GetLaborSummaryUseCase).mockImplementation(() => {
      return { execute: mockExecute } as any;
    });

    render(<Page />);

    // 初期ロードを待つ
    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalled();
    });
    mockExecute.mockClear();

    // 開始日と終了日を不正な関係にする
    const startDateInput = screen.getByTestId('start-date-input') as HTMLInputElement;
    const endDateInput = screen.getByTestId('end-date-input') as HTMLInputElement;

    fireEvent.change(startDateInput, { target: { value: '2026-04-15' } });
    fireEvent.change(endDateInput, { target: { value: '2026-04-10' } });

    const calculateBtn = screen.getByTestId('calculate-btn');
    fireEvent.click(calculateBtn);

    await waitFor(() => {
      expect(screen.getByText('終了日は開始日以降の日付を入力してください')).toBeInTheDocument();
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  it('CSVダウンロードボタンを押下した際に、URLオブジェクトの生成とダウンロードアクションが走ること', async () => {
    sessionStorage.setItem('role', 'FACTORY_ADMIN');
    sessionStorage.setItem('user_id', 'admin-001');

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-object-url');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    render(<Page />);

    // データロードを待つ
    await waitFor(() => {
      expect(screen.getByText('山田 太郎')).toBeInTheDocument();
    });

    const csvBtn = screen.getByTestId('csv-download-btn');
    expect(csvBtn).not.toBeDisabled();
    fireEvent.click(csvBtn);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});