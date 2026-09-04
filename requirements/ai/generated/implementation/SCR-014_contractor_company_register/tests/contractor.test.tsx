import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ContractorCompanyRegisterPage from '../app/(factory)/admin/contractors/page';
import { dbManager } from '../lib/db/idb';

// Next.js Navigation のモック (renderごとに新しいオブジェクト参照を生成して無限再レンダリングが起きるのを防ぐため、安定した参照を返す)
const { mockPush, mockRouter } = vi.hoisted(() => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
  };
  return {
    mockPush,
    mockRouter,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('SCR-014: 外注先企業登録画面 テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbManager.resetDatabase();
    sessionStorage.clear();
  });

  it('TST-SCR-014-001: 正常にログインされている状態で、登録されている外注先企業一覧が正常表示されること', async () => {
    // 工場側管理者としてセッションをセット
    const mockSession = {
      userId: 'admin-123',
      displayName: 'テスト工場管理者',
      role: 'FACTORY_ADMIN',
      contractorId: null,
    };
    sessionStorage.setItem('mock_session', JSON.stringify(mockSession));

    render(<ContractorCompanyRegisterPage />);

    // 読み込み中表示を待つ
    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).toBeNull();
    });

    // 初期シードの2件が画面に表示されていること (PC表示用テーブルとモバイル表示用カードの双方に出力されるため、getAllByTextを使用)
    expect(screen.getAllByText('株式会社A建設')[0]).toBeInTheDocument();
    expect(screen.getAllByText('有限会社B電設')[0]).toBeInTheDocument();
  });

  it('TST-SCR-014-002: 新規登録時に企業名が空の場合、バリデーションエラーが発生すること', async () => {
    const mockSession = {
      userId: 'admin-123',
      displayName: 'テスト工場管理者',
      role: 'FACTORY_ADMIN',
      contractorId: null,
    };
    sessionStorage.setItem('mock_session', JSON.stringify(mockSession));

    render(<ContractorCompanyRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).toBeNull();
    });

    // 「新規登録」モーダルを開く
    const createBtn = screen.getByText('新規登録');
    fireEvent.click(createBtn);

    // モーダルオープン確認
    expect(screen.getByText('外注先企業の新規登録')).toBeInTheDocument();

    // 企業名を空（または半角スペース）にして保存ボタンをクリック
    const nameInput = screen.getByPlaceholderText('例: 株式会社サンプル建設');
    fireEvent.change(nameInput, { target: { value: '   ' } });

    const saveBtn = screen.getByText('保存');
    fireEvent.click(saveBtn);

    // エラーメッセージが表示されていること
    await waitFor(() => {
      expect(screen.getByText('企業名は必須入力です')).toBeInTheDocument();
    });
  });

  it('TST-SCR-014-003: 正常に新規登録が行われ、一覧がリロードされて追加されること', async () => {
    const mockSession = {
      userId: 'admin-123',
      displayName: 'テスト工場管理者',
      role: 'FACTORY_ADMIN',
      contractorId: null,
    };
    sessionStorage.setItem('mock_session', JSON.stringify(mockSession));

    render(<ContractorCompanyRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).toBeNull();
    });

    // モーダルを開く
    fireEvent.click(screen.getByText('新規登録'));

    // 有効な企業名を入力して保存
    fireEvent.change(screen.getByPlaceholderText('例: 株式会社サンプル建設'), {
      target: { value: '新規テスト外注先' },
    });

    fireEvent.click(screen.getByText('保存'));

    // トーストが表示され、新規企業が一覧に表示されること (PC表示用テーブルとモバイル表示用カードの双方に出力されるため、getAllByTextを使用)
    await waitFor(() => {
      expect(screen.getByText('外注先企業を登録しました')).toBeInTheDocument();
      expect(screen.getAllByText('新規テスト外注先')[0]).toBeInTheDocument();
    });
  });

  it('TST-SCR-014-004: 削除操作で確認ダイアログが表示され、キャンセルした場合は削除が行われないこと', async () => {
    const mockSession = {
      userId: 'admin-123',
      displayName: 'テスト工場管理者',
      role: 'FACTORY_ADMIN',
      contractorId: null,
    };
    sessionStorage.setItem('mock_session', JSON.stringify(mockSession));

    // confirmを「キャンセル（false）」にモック
    const confirmMock = vi.spyOn(window, 'confirm').mockImplementation(() => false);

    render(<ContractorCompanyRegisterPage />);

    await waitFor(() => {
      expect(screen.queryByText('読み込み中...')).toBeNull();
    });

    // 最初の行（株式会社A建設など）の「削除」ボタンを取得してクリック
    const deleteButtons = screen.getAllByText('削除');
    fireEvent.click(deleteButtons[0]);

    // confirmが呼ばれていること
    expect(confirmMock).toHaveBeenCalled();

    // キャンセルされたため、一覧から消えていないこと (PC表示用テーブルとモバイル表示用カードの双方に出力されるため、getAllByTextを使用)
    expect(screen.getAllByText('株式会社A建設')[0]).toBeInTheDocument();
  });
});