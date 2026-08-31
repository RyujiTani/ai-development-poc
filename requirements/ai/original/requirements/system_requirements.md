```markdown
---
doc_type: system_requirements
version: 1.1.0
generated_at: 2026-04-13T00:00:00+09:00
source: 製造業向け作業員管理システム 要件定義書（raw）
scope_note: 画面仕様は本書では扱わない（別ファイル管理）。本バージョンはテストプロジェクト用にフロントエンド単体構成へ変更。
change_log:
  - v1.1.0: GCPバックエンド実装をスコープアウト。Next.js による画面単体動作（モックデータ + ブラウザ内永続化）構成へ変更。
---

## 1. システム概要

### 1.1 プロダクト名
- 製造業向け 外注作業員 勤怠・配置管理システム（**テストプロジェクト版 / フロントエンドのみ**）
- コードネーム: `worker-attendance-system-frontend` [ASSUMPTION] 原文に正式名称指定なし。

### 1.2 目的（テストプロジェクト版）
- 本来要件（写真付き打刻・労働時間集計・有資格者配置確認・ペーパーレス化）を、**Next.js 単体で動作する画面プロトタイプ**として検証する。
- バックエンド（GCP / Cloud Run / Spanner / Cloud Storage 等）は**実装しない**。データはクライアント内で擬似的に保持・操作する。

### 1.3 想定ユーザー
| ロール | 端末 | 主な操作 |
|---|---|---|
| 工場側管理者 | PC（Chrome） | 全体管理、外注先・ユーザー登録、打刻実績・写真確認、集計、CSV出力 |
| 外注先管理者 | スマホ／タブレット（Chrome） | 自社作業員マスタ管理、現場での代行打刻（写真撮影込）、打刻修正 |
| 現場作業員 | （ログインなし） | 操作なし |

### 1.4 スコープ（v1.1.0で更新）
- IN
  - Next.js による画面実装（レスポンシブ、PC／タブレット／スマホ）
  - HTML5 Camera API による写真撮影 UI
  - クライアント内モックデータによる打刻／マスタ管理／集計／CSV出力動作
  - ID/PW ログイン UI（モック認証）
  - ロール別画面遷移（工場側管理者 / 外注先管理者）
- OUT
  - **GCP バックエンド全般（App Engine / Cloud Run / Spanner / Cloud Storage / Secret Manager 等）**
  - サーバサイド API 実装、DB マイグレーション、本番運用相当の認証・認可
  - 給与計算本体
  - ネイティブアプリ
  - 本番セキュリティ要件（実運用前提のSSL証明書管理、署名付きURL基盤等）

### 1.5 スケジュール
- テストプロジェクトのため原文スケジュールは参考扱い。マイルストーンは [TODO: 要確認]。

---

## 2. 技術スタック

### 2.1 確定事項（v1.1.0）
| レイヤ | 採用技術 |
|---|---|
| フレームワーク | **Next.js 14 (App Router)** [ASSUMPTION] App Router 採用。Pages Router 希望なら [TODO: 要確認] |
| 言語 | TypeScript 5.x |
| ランタイム | Node.js 20 LTS |
| UI ライブラリ | React 18 |
| スタイリング | Tailwind CSS 3.x [ASSUMPTION] レスポンシブと大きめタップ領域の実装が容易なため |
| コンポーネント | shadcn/ui [ASSUMPTION] 軽量で Tailwind と整合 |
| フォーム | React Hook Form + Zod（バリデーション） [ASSUMPTION] |
| 状態管理 | React Context + Zustand [ASSUMPTION] グローバル状態が小規模なため |
| データ永続化 | **ブラウザ内 IndexedDB（idb ライブラリ経由）** + 初期シード JSON [ASSUMPTION] localStorage では写真Blob容量が不足するため IndexedDB を採用 |
| 写真撮影 | HTML5 `getUserMedia` + `<canvas>` でJPEG化 |
| CSV 出力 | papaparse + Blob ダウンロード |
| 対応ブラウザ | Google Chrome 最新版 |

### 2.2 やらないこと（明示）
- データベース接続なし（Spanner、PostgreSQL 等を含む一切の外部DB禁止）
- API ルート (`app/api/**`) で**外部サービスを叩かない**。必要ならモック応答のみ。
- 環境変数による外部シークレット参照なし（Secret Manager 不使用）

---

## 3. アーキテクチャ方針

### 3.1 全体構成
```
[Browser (PC / Mobile Chrome)]
        │
        ▼
[Next.js App (App Router, SSR/CSR)]
   ├─ UI Layer (app/, components/)
   ├─ Application Layer (features/*/usecase)
   ├─ Domain Layer (features/*/domain)
   └─ Infrastructure Layer (mock repository)
            └─► IndexedDB (idb)  ※ 写真 Blob / マスタ / 打刻履歴
            └─► /public/mocks/*.json  ※ 初期シード
```
- すべての「リポジトリ」はインターフェースとして定義し、**実装は IndexedDB アダプタのみ**。
  将来 GCP バックエンドに差し替える前提でI/Fを切っておくが、本プロジェクトでは差し替えない。

### 3.2 推奨ディレクトリ構造
```
/  (リポジトリルート)
├─ app/                       # Next.js App Router
│  ├─ (auth)/login/page.tsx
│  ├─ (factory)/...           # 工場側管理者ルート
│  ├─ (contractor)/...        # 外注先管理者ルート
│  ├─ layout.tsx
│  └─ globals.css
├─ components/                # 汎用UI
├─ features/
│  ├─ attendance/
│  │  ├─ domain/              # エンティティ・型
│  │  ├─ usecase/             # ユースケース関数
│  │  ├─ repository/          # I/F + IndexedDB 実装
│  │  └─ ui/                  # 画面部品
│  ├─ worker/
│  ├─ contractor/
│  ├─ user/
│  └─ report/                 # 集計 / CSV
├─ lib/
│  ├─ db/                     # idb ラッパ
│  ├─ auth/                   # モック認証
│  ├─ csv/
│  └─ logger/
├─ public/
│  └─ mocks/                  # 初期シード JSON
├─ tests/
└─ package.json
```

---

## 4. 共通仕様

### 4.1 命名規則
| 対象 | 規則 | 例 |
|---|---|---|
| 変数・関数 | lowerCamelCase | `workerId`, `createAttendance()` |
| 型・コンポーネント | UpperCamelCase | `WorkerList`, `AttendanceRecord` |
| 定数 | UPPER_SNAKE_CASE | `MAX_PHOTO_SIZE_MB` |
| ファイル（コンポーネント） | UpperCamelCase.tsx | `WorkerList.tsx` |
| ファイル（その他） | camelCase.ts | `attendanceRepository.ts` |
| ルートセグメント | kebab-case | `app/(factory)/attendance-history/page.tsx` |
| モック内テーブル名 | snake_case 複数形 | `workers`, `attendance_records` |

### 4.2 エラーハンドリング方針
- ユースケース層は `Result<T, AppError>` 型を返却し、UI 層で表示メッセージへ変換する [ASSUMPTION]。
- ブラウザ通知は `toast` で統一表示。
- 例外は ErrorBoundary で捕捉。

### 4.3 ログ出力方針
- 本プロジェクトはサーバ送信なし。`lib/logger` 経由で `console` に構造化出力（`{level, event, payload}`）。
- 個人情報・写真Blobはログ出力禁止（IDのみ）。

### 4.4 認証・認可（モック）
- ID/PW を IndexedDB の `users` テーブル（初期シード）と突合するモック認証。
- セッションは `sessionStorage` にユーザIDとロールを保持 [ASSUMPTION]。
- ロール: `FACTORY_ADMIN` / `CONTRACTOR_MANAGER`。
- 外注先管理者は自社 `contractor_id` のデータのみ閲覧・操作可（リポジトリ層でフィルタ強制）。
- **本番相当のセキュリティ実装は行わない**（本テストプロジェクトの明示的非ゴール）。

---

## 5. データモデル（クライアント内モック）

> Spanner DDL は廃止。IndexedDB 上に同等構造のオブジェクトストアを定義する。

### 5.1 オブジェクトストア一覧
| ストア名 | キー | 説明 |
|---|---|---|
| `contractors` | `contractor_id` | 外注先企業 |
| `users` | `user_id` | 利用者（工場側 / 外注先管理者） |
| `workers` | `worker_id` | 作業員マスタ（contractor_id でインデックス） |
| `attendance_records` | `attendance_id` | 打刻実績 |
| `attendance_corrections` | `correction_id` | 打刻修正履歴 |
| `photo_blobs` | `photo_object_id` | 写真の Blob 本体 |
| `audit_logs` | `audit_id` | 監査ログ（モック） |

### 5.2 型定義（TypeScript）

```ts
export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';
export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';
export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface Contractor {
  contractor_id: string;          // UUID
  name: string;
  status: Extract<Status, 'ACTIVE' | 'INACTIVE'>;
  created_at: string;             // ISO8601
  updated_at: string;
}

export interface User {
  user_id: string;
  contractor_id: string | null;   // null = 工場側管理者
  role: Role;
  login_id: string;
  password_hash: string;          // モックでも平文保存はしない（簡易ハッシュ可）
  display_name: string;
  status: Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  worker_id: string;
  contractor_id: string;
  name: string;
  contact?: string;
  qualifications: string[];       // 資格コード配列
  trainings: Array<{ code: string; taken_at: string }>;
  status: Extract<Status, 'ACTIVE' | 'RETIRED'>;
  retired_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  attendance_id: string;
  worker_id: string;
  contractor_id: string;
  punch_type: PunchType;
  clocked_at: string;             // ISO8601
  punched_by: string;             // user_id
  geo?: { lat: number; lng: number };
  photo_object_id: string;
  created_at: string;
}

export interface AttendanceCorrection {
  correction_id: string;
  attendance_id?: string;         // 新規登録時 undefined
  corrected_by: string;
  reason: string;                 // 必須
  before?: Partial<AttendanceRecord>;
  after: Partial<AttendanceRecord>;
  corrected_at: string;
}

export interface PhotoBlob {
  photo_object_id: string;
  blob: Blob;                     // IndexedDB に Blob 直接保存
  content_type: string;
  byte_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

export interface AuditLog {
  audit_id: string;
  occurred_at: string;
  actor_user_id?: string;
  actor_role?: Role;
  action: string;                 // LOGIN / CREATE_WORKER / PUNCH / CORRECT_PUNCH ...
  target_type?: string;
  target_id?: string;
  detail?: Record<string, unknown>;
}
```

### 5.3 初期シード
- `public/mocks/seed.json` に外注先2社・ユーザー数名・作業員数十名・打刻実績数百件を投入 [ASSUMPTION]。
- アプリ初回起動時、IndexedDB が空ならシードを取り込む。リセットボタンで再投入可能。

### 5.4 データ保持
- 本テストプロジェクトでは法定保持（5年）は適用しない。**ブラウザ内のみ**で揮発前提。
- 開発者向けに「全データリセット」機能を提供。

---

## 6. 非機能要件（テストプロジェクト版）

### 6.1 パフォーマンス
- 撮影〜画面遷移完了まで 3秒以内（クライアント完結のため、ネットワーク待ち時間は対象外）。
- 撮影画像はクライアント側で長辺 1280px / JPEG quality 0.7 / 上限 1MB 程度に圧縮 [ASSUMPTION]。

### 6.2 セキュリティ
- **本番相当の対策は行わない**（テストプロジェクト明示）。
- ただし以下は実装する:
  - パスワードを平文表示しない
  - XSS 対策として React の標準エスケープに従う（`dangerouslySetInnerHTML` 禁止）
  - 写真 Blob を IndexedDB から取り出す際、Object URL を都度発行・revoke する

### 6.3 可用性
- ローカル動作のみ。可用性指標は対象外。

### 6.4 監査ログ
- IndexedDB の `audit_logs` に記録（参照画面の有無は [TODO: 要確認]）。

---

## 7. CI/CD・テスト方針

### 7.1 CI（[ASSUMPTION] GitHub Actions）
- パイプライン
  1. `pnpm install`
  2. `pnpm lint`（ESLint + Prettier）
  3. `pnpm typecheck`（tsc --noEmit）
  4. `pnpm test`（Vitest）
  5. `pnpm build`（Next.js production build の通過確認）
- デプロイは行わない（必要なら Vercel Preview のみ）[TODO: 要確認]。

### 7.2 テストフレームワーク
- ユニット: Vitest + React Testing Library
- E2E: Playwright（主要画面遷移と打刻フローのみ）[ASSUMPTION]
- カバレッジ目標: ライン 70%（テストプロジェクトのため緩和）[ASSUMPTION]

### 7.3 PR 作成条件
- 1 PR は 1 関心事に限定。
- CI 全項目グリーンが merge 条件。
- レビュー1名以上の承認 [ASSUMPTION]。

---

## 8. コード生成エージェントへの制約

### 8.1 やってよいこと
- Next.js 14 (App Router) + TypeScript + Tailwind による画面・コンポーネント生成。
- IndexedDB（idb 経由）のリポジトリ実装。
- モック認証・モックユースケース・モック CSV 出力の生成。
- HTML5 Camera API を利用した撮影 UI 実装。
- Vitest / Playwright によるテストコード生成。
- 第3章のディレクトリ構造・第4章の命名規則・第5章の型定義に準拠した実装。

### 8.2 やってはいけないこと
- **GCP サービス（App Engine / Cloud Run / Spanner / Cloud Storage / Secret Manager 等）への接続コードを生成すること**。
- **任意の外部DB（PostgreSQL / MySQL / MongoDB 等）への接続コードを生成すること**。
- Next.js の `app/api/**` から外部HTTPエンドポイントへ実通信を行うこと（モック応答のみ可）。
- 環境変数で外部APIキー・シークレットを参照する実装（`process.env` の業務用シークレット利用禁止）。
- 写真 Blob・パスワード・個人情報をログまたは画面のデバッグ出力に表示すること。
- マルチテナントスコープ（`contractor_id` フィルタ）を省略したリポジトリ実装。
- 認証ガード（`(factory)` / `(contractor)` ルートグループ）を経由しないページ追加。
- ネイティブアプリ向けコードの生成。
- 給与計算ロジック本体の実装（CSV 出力までがスコープ）。
- 第三者ライブラリの無断追加（追加時は PR 説明にライセンスと選定理由を明記）。
- 画面仕様の確定判断を本書のみを根拠として行うこと（画面仕様書は別管理）。
- `[TODO: 要確認]` 項目を確認なしに確定して実装すること。

### 8.3 未決事項
- [TODO: 要確認] App Router / Pages Router の最終確定（本書は App Router 前提）
- [TODO: 要確認] Vercel Preview デプロイの要否
- [TODO: 要確認] 監査ログ参照画面の要否
- [TODO: 要確認] 打刻時刻の丸めルール
- [TODO: 要確認] 打刻修正の承認フロー
- [TODO: 要確認] 複数人同時撮影時の扱い（証拠写真 / 顔認識）
- [TODO: 要確認] オフライン挙動（Service Worker による完全オフライン対応の要否）
- [TODO: 要確認] 初期シードの規模・内容
```