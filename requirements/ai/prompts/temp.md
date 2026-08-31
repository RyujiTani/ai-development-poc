# transform_screen_specification.md

## Role

あなたは、システム要件・Traceability情報・画面設計情報を統合し、AIによる画面実装およびテスト実行に利用可能な「Screen Specification JSON」を生成する専門家です。

入力として以下の3つのファイルを受け取ります。

1. `system_requirements.json`
2. `trace_index.json`
3. 対象画面の画面設計Markdown

3つの入力を突合し、対象画面1画面分について、以下を満たすJSONを生成してください。

* 画面実装に必要な要件を構造化する
* Trace IDを完全に保持する
* システム要件との整合性を確保する
* 画面設計Markdownの具体的なUI・操作・状態を保持する
* Acceptance Criteriaを生成する
* 実装・検証可能なTest Caseを生成する
* Requirement → Acceptance → TestのTraceabilityを明示する
* 入力間の矛盾や未確定事項を明示する
* 入力に存在しない仕様を勝手に追加しない

---

# Input

入力は必ず以下のJSON形式で与えられます。

```json
{
  "system_requirements": "{
  "version": "1.0",
  "source": {
    "doc_type": "system_requirements",
    "source_version": "1.1.0",
    "generated_at": "2026-04-13T00:00:00+09:00"
  },
  "scope": {
    "product": "製造業向け 外注作業員 勤怠・配置管理システム（テストプロジェクト版 / フロントエンドのみ）",
    "codename": {
      "value": "worker-attendance-system-frontend",
      "status": "assumption"
    },
    "purpose": "写真付き打刻・労働時間集計・有資格者配置確認・ペーパーレス化をNext.js単体動作画面プロトタイプとして検証",
    "in": [
      "Next.js による画面実装（レスポンシブ、PC／タブレット／スマホ）",
      "HTML5 Camera API による写真撮影 UI",
      "クライアント内モックデータによる打刻／マスタ管理／集計／CSV出力動作",
      "ID/PW ログイン UI（モック認証）",
      "ロール別画面遷移（工場側管理者 / 外注先管理者）"
    ],
    "out": [
      "GCP バックエンド全般（App Engine / Cloud Run / Spanner / Cloud Storage / Secret Manager 等）",
      "サーバサイド API 実装、DB マイグレーション、本番運用相当の認証・認可",
      "給与計算本体",
      "ネイティブアプリ",
      "本番セキュリティ要件（実運用前提のSSL証明書管理、署名付きURL基盤等）"
    ],
    "status": "confirmed"
  },
  "users": [
    {
      "role": "FACTORY_ADMIN",
      "label": "工場側管理者",
      "device": "PC",
      "browser": "Chrome",
      "operations": [
        "全体管理",
        "外注先・ユーザー登録",
        "打刻実績・写真確認",
        "集計",
        "CSV出力"
      ]
    },
    {
      "role": "CONTRACTOR_MANAGER",
      "label": "外注先管理者",
      "device": "スマホ／タブレット",
      "browser": "Chrome",
      "operations": [
        "自社作業員マスタ管理",
        "現場での代行打刻（写真撮影込）",
        "打刻修正"
      ]
    },
    {
      "role": null,
      "label": "現場作業員",
      "device": null,
      "browser": null,
      "operations": [
        "ログインなし・操作なし"
      ]
    }
  ],
  "technology": [
    {
      "category": "framework",
      "name": "Next.js",
      "version": "14 (App Router)",
      "status": "assumption"
    },
    {
      "category": "language",
      "name": "TypeScript",
      "version": "5.x",
      "status": "confirmed"
    },
    {
      "category": "runtime",
      "name": "Node.js",
      "version": "20 LTS",
      "status": "confirmed"
    },
    {
      "category": "ui_library",
      "name": "React",
      "version": "18",
      "status": "confirmed"
    },
    {
      "category": "styling",
      "name": "Tailwind CSS",
      "version": "3.x",
      "status": "assumption"
    },
    {
      "category": "components",
      "name": "shadcn/ui",
      "version": null,
      "status": "assumption"
    },
    {
      "category": "form",
      "name": "React Hook Form + Zod",
      "version": null,
      "status": "assumption"
    },
    {
      "category": "state_management",
      "name": "React Context + Zustand",
      "version": null,
      "status": "assumption"
    },
    {
      "category": "persistence",
      "name": "IndexedDB (idb) + initial seed JSON",
      "version": null,
      "status": "assumption"
    },
    {
      "category": "camera",
      "name": "HTML5 getUserMedia + <canvas> (JPEG)",
      "version": null,
      "status": "confirmed"
    },
    {
      "category": "csv",
      "name": "papaparse + Blob download",
      "version": null,
      "status": "confirmed"
    },
    {
      "category": "browser",
      "name": "Google Chrome",
      "version": "latest",
      "status": "confirmed"
    }
  ],
  "architecture": {
    "layers": [
      "UI Layer (app/, components/)",
      "Application Layer (features/*/usecase)",
      "Domain Layer (features/*/domain)",
      "Infrastructure Layer (mock repository -> IndexedDB, /public/mocks/*.json)"
    ],
    "directory_structure": [
      "app/(auth)/login/page.tsx",
      "app/(factory)/...",
      "app/(contractor)/...",
      "app/layout.tsx",
      "app/globals.css",
      "components/",
      "features/attendance/domain/",
      "features/attendance/usecase/",
      "features/attendance/repository/",
      "features/attendance/ui/",
      "features/worker/",
      "features/contractor/",
      "features/user/",
      "features/report/",
      "lib/db/",
      "lib/auth/",
      "lib/csv/",
      "lib/logger/",
      "public/mocks/",
      "tests/",
      "package.json"
    ],
    "repository": {
      "definition": "interface_only",
      "implementation": "IndexedDB_adapter_only",
      "backend_replacement": false
    },
    "persistence": {
      "type": "IndexedDB",
      "wrapper": "idb",
      "seed_source": "/public/mocks/*.json"
    }
  },
  "conventions": {
    "naming": [
      {
        "target": "variables_functions",
        "rule": "lowerCamelCase",
        "example": "workerId, createAttendance()"
      },
      {
        "target": "types_components",
        "rule": "UpperCamelCase",
        "example": "WorkerList, AttendanceRecord"
      },
      {
        "target": "constants",
        "rule": "UPPER_SNAKE_CASE",
        "example": "MAX_PHOTO_SIZE_MB"
      },
      {
        "target": "component_files",
        "rule": "UpperCamelCase.tsx",
        "example": "WorkerList.tsx"
      },
      {
        "target": "other_files",
        "rule": "camelCase.ts",
        "example": "attendanceRepository.ts"
      },
      {
        "target": "route_segments",
        "rule": "kebab-case",
        "example": "app/(factory)/attendance-history/page.tsx"
      },
      {
        "target": "mock_tables",
        "rule": "snake_case_plural",
        "example": "workers, attendance_records"
      }
    ],
    "error_handling": {
      "usecase_return": "Result<T, AppError>",
      "ui_notification": "toast",
      "exception_catch": "ErrorBoundary",
      "status": "assumption"
    },
    "logging": {
      "destination": "console",
      "wrapper": "lib/logger",
      "format": "{level, event, payload}",
      "server_transmission": false,
      "forbidden_payloads": [
        "personal_information",
        "photo_blob",
        "password"
      ]
    }
  },
  "authentication": {
    "method": "mock_auth_against_indexeddb_users",
    "session_storage": "sessionStorage",
    "stored_data": [
      "user_id",
      "role"
    ],
    "session_storage_status": "assumption",
    "roles": [
      "FACTORY_ADMIN",
      "CONTRACTOR_MANAGER"
    ],
    "scope_rule": "CONTRACTOR_MANAGER is restricted to own contractor_id via repository filtering",
    "production_security": false
  },
  "data_model": {
    "stores": [
      {
        "name": "contractors",
        "key": "contractor_id",
        "description": "外注先企業"
      },
      {
        "name": "users",
        "key": "user_id",
        "description": "利用者（工場側 / 外注先管理者）"
      },
      {
        "name": "workers",
        "key": "worker_id",
        "description": "作業員マスタ（contractor_id でインデックス）"
      },
      {
        "name": "attendance_records",
        "key": "attendance_id",
        "description": "打刻実績"
      },
      {
        "name": "attendance_corrections",
        "key": "correction_id",
        "description": "打刻修正履歴"
      },
      {
        "name": "photo_blobs",
        "key": "photo_object_id",
        "description": "写真の Blob 本体"
      },
      {
        "name": "audit_logs",
        "key": "audit_id",
        "description": "監査ログ（モック）"
      }
    ],
    "types": [
      "export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';",
      "export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';",
      "export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';",
      "export interface Contractor { contractor_id: string; name: string; status: Extract<Status, 'ACTIVE' | 'INACTIVE'>; created_at: string; updated_at: string; }",
      "export interface User { user_id: string; contractor_id: string | null; role: Role; login_id: string; password_hash: string; display_name: string; status: Extract<Status, 'ACTIVE' | 'LOCKED' | 'DISABLED'>; last_login_at?: string; created_at: string; updated_at: string; }",
      "export interface Worker { worker_id: string; contractor_id: string; name: string; contact?: string; qualifications: string[]; trainings: Array<{ code: string; taken_at: string }>; status: Extract<Status, 'ACTIVE' | 'RETIRED'>; retired_at?: string; created_at: string; updated_at: string; }",
      "export interface AttendanceRecord { attendance_id: string; worker_id: string; contractor_id: string; punch_type: PunchType; clocked_at: string; punched_by: string; geo?: { lat: number; lng: number }; photo_object_id: string; created_at: string; }",
      "export interface AttendanceCorrection { correction_id: string; attendance_id?: string; corrected_by: string; reason: string; before?: Partial<AttendanceRecord>; after: Partial<AttendanceRecord>; corrected_at: string; }",
      "export interface PhotoBlob { photo_object_id: string; blob: Blob; content_type: string; byte_size: number; uploaded_by: string; uploaded_at: string; }",
      "export interface AuditLog { audit_id: string; occurred_at: string; actor_user_id?: string; actor_role?: Role; action: string; target_type?: string; target_id?: string; detail?: Record<string, unknown>; }"
    ]
  },
  "seed": {
    "source_file": "public/mocks/seed.json",
    "content": "外注先2社・ユーザー数名・作業員数十名・打刻実績数百件",
    "content_status": "assumption",
    "load_condition": "アプリ初回起動時 IndexedDB が空の場合",
    "reset_capability": true,
    "retention": "ブラウザ内揮発前提（法定保持5年非適用）"
  },
  "non_functional": {
    "performance": [
      {
        "target": "photo_capture_to_transition",
        "limit": "3秒以内",
        "note": "クライアント完結"
      },
      {
        "target": "photo_compression",
        "spec": "長辺 1280px / JPEG quality 0.7 / 上限 1MB 程度",
        "status": "assumption"
      }
    ],
    "security": [
      {
        "rule": "production_security_scope",
        "spec": "本番相当の対策は行わない（テストプロジェクト明示）"
      },
      {
        "rule": "password_display",
        "spec": "パスワードを平文表示しない"
      },
      {
        "rule": "xss_prevention",
        "spec": "React標準エスケープ準拠（dangerouslySetInnerHTML禁止）"
      },
      {
        "rule": "blob_lifecycle",
        "spec": "写真BlobのObject URLは都度発行・revokeする"
      }
    ],
    "availability": [
      {
        "rule": "local_operation_only",
        "spec": "可用性指標は対象外"
      }
    ],
    "audit_log": {
      "destination": "IndexedDB audit_logs",
      "ui_view_status": "todo"
    }
  },
  "testing": {
    "ci": [
      "pnpm install",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm test",
      "pnpm build"
    ],
    "ci_platform": {
      "name": "GitHub Actions",
      "status": "assumption"
    },
    "frameworks": [
      {
        "type": "unit",
        "name": "Vitest + React Testing Library",
        "status": "confirmed"
      },
      {
        "type": "e2e",
        "name": "Playwright (主要画面遷移と打刻フローのみ)",
        "status": "assumption"
      }
    ],
    "coverage": {
      "target": "line 70%",
      "status": "assumption"
    },
    "pr_rules": [
      {
        "rule": "1 PR は 1 関心事に限定",
        "status": "confirmed"
      },
      {
        "rule": "CI 全項目グリーンが merge 条件",
        "status": "confirmed"
      },
      {
        "rule": "レビュー1名以上の承認",
        "status": "assumption"
      }
    ]
  },
  "implementation_constraints": {
    "allowed": [
      "Next.js 14 (App Router) + TypeScript + Tailwind による画面・コンポーネント生成",
      "IndexedDB（idb 経由）のリポジトリ実装",
      "モック認証・モックユースケース・モック CSV 出力の生成",
      "HTML5 Camera API を利用した撮影 UI 実装",
      "Vitest / Playwright によるテストコード生成",
      "指定ディレクトリ構造・命名規則・型定義に準拠した実装"
    ],
    "forbidden": [
      "GCP サービス（App Engine / Cloud Run / Spanner / Cloud Storage / Secret Manager 等）への接続コード生成",
      "任意の外部DB（PostgreSQL / MySQL / MongoDB 等）への接続コード生成",
      "Next.js の app/api/** から外部HTTPエンドポイントへの実通信（モック応答のみ可）",
      "環境変数による外部APIキー・シークレット参照（process.env の業務用シークレット利用禁止）",
      "写真 Blob・パスワード・個人情報のログ出力および画面デバッグ表示",
      "マルチテナントスコープ（contractor_id フィルタ）を省略したリポジトリ実装",
      "認証ガード（(factory) / (contractor) ルートグループ）を経由しないページ追加",
      "ネイティブアプリ向けコード生成",
      "給与計算ロジック本体の実装（CSV 出力までがスコープ）",
      "第三者ライブラリの無断追加（追加時は PR 説明にライセンスと選定理由を明記）",
      "画面仕様の確定判断を本書のみを根拠として行うこと（画面仕様書は別管理）",
      "TODO: 要確認 項目を確認なしに確定して実装すること"
    ]
  },
  "open_items": [
    {
      "id": "TODO-001",
      "target": "milestone_schedule",
      "value": "テストプロジェクトのマイルストーン・スケジュール",
      "status": "todo"
    },
    {
      "id": "TODO-002",
      "target": "router_selection",
      "value": "App Router / Pages Router の最終確定（本書は App Router 前提）",
      "status": "todo"
    },
    {
      "id": "TODO-003",
      "target": "deployment",
      "value": "Vercel Preview デプロイの要否",
      "status": "todo"
    },
    {
      "id": "TODO-004",
      "target": "audit_log_ui",
      "value": "監査ログ参照画面の要否",
      "status": "todo"
    },
    {
      "id": "TODO-005",
      "target": "attendance_rounding",
      "value": "打刻時刻の丸めルール",
      "status": "todo"
    },
    {
      "id": "TODO-006",
      "target": "attendance_correction_approval",
      "value": "打刻修正の承認フロー",
      "status": "todo"
    },
    {
      "id": "TODO-007",
      "target": "multi_person_photo",
      "value": "複数人同時撮影時の扱い（証拠写真 / 顔認識）",
      "status": "todo"
    },
    {
      "id": "TODO-008",
      "target": "offline_mode",
      "value": "オフライン挙動（Service Worker による完全オフライン対応の要否）",
      "status": "todo"
    },
    {
      "id": "TODO-009",
      "target": "seed_scale",
      "value": "初期シードの規模・内容",
      "status": "todo"
    }
  ],
  "traceability": {}
}",
  "trace_index": "{
  "version": "1.0",
  "source": {
    "doc_type": "trace_index",
    "source_version": "1.0.0"
  },
  "summary": {
    "total_screens": 15,
    "total_trace_ids": 236
  },
  "screens": [
    {
      "id": "SCR-001",
      "name": "外注先ログイン画面",
      "user": "外注先管理者",
      "trace_count": 11
    },
    {
      "id": "SCR-002",
      "name": "外注先ホーム画面",
      "user": "外注先管理者",
      "trace_count": 11
    },
    {
      "id": "SCR-003",
      "name": "打刻モード選択画面",
      "user": "外注先管理者",
      "trace_count": 10
    },
    {
      "id": "SCR-004",
      "name": "作業員選択画面",
      "user": "外注先管理者",
      "trace_count": 15
    },
    {
      "id": "SCR-005",
      "name": "撮影・送信画面",
      "user": "外注先管理者",
      "trace_count": 19
    },
    {
      "id": "SCR-006",
      "name": "打刻完了画面",
      "user": "外注先管理者",
      "trace_count": 8
    },
    {
      "id": "SCR-007",
      "name": "作業員一覧画面",
      "user": "外注先管理者",
      "trace_count": 18
    },
    {
      "id": "SCR-008",
      "name": "作業員追加・編集画面",
      "user": "外注先管理者",
      "trace_count": 18
    },
    {
      "id": "SCR-009",
      "name": "外注先打刻修正画面",
      "user": "外注先管理者",
      "trace_count": 14
    },
    {
      "id": "SCR-010",
      "name": "管理者ログイン画面",
      "user": "工場側管理者",
      "trace_count": 10
    },
    {
      "id": "SCR-011",
      "name": "総合ダッシュボード",
      "user": "工場側管理者",
      "trace_count": 16
    },
    {
      "id": "SCR-012",
      "name": "打刻履歴確認画面",
      "user": "工場側管理者",
      "trace_count": 22
    },
    {
      "id": "SCR-013",
      "name": "労働時間集計画面",
      "user": "工場側管理者",
      "trace_count": 16
    },
    {
      "id": "SCR-014",
      "name": "外注先企業登録画面",
      "user": "工場側管理者",
      "trace_count": 21
    },
    {
      "id": "SCR-015",
      "name": "管理者ユーザー登録画面",
      "user": "工場側管理者",
      "trace_count": 27
    }
  ],
  "traces": [
    {
      "id": "SCR-001-FN-001",
      "screen_id": "SCR-001",
      "type": "functional",
      "summary": "ID/パスワードによるログイン認証"
    },
    {
      "id": "SCR-001-UI-001",
      "screen_id": "SCR-001",
      "type": "ui",
      "summary": "入力欄・ボタンを画面中央に配置"
    },
    {
      "id": "SCR-001-UI-002",
      "screen_id": "SCR-001",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-001-UI-003",
      "screen_id": "SCR-001",
      "type": "ui",
      "summary": "スマホ向け大きいタップUIui"
    },
    {
      "id": "SCR-001-VL-001",
      "screen_id": "SCR-001",
      "type": "validation",
      "summary": "ID必須入力"
    },
    {
      "id": "SCR-001-VL-002",
      "screen_id": "SCR-001",
      "type": "validation",
      "summary": "パスワード必須入力"
    },
    {
      "id": "SCR-001-VL-003",
      "screen_id": "SCR-001",
      "type": "validation",
      "summary": "認証エラー表示"
    },
    {
      "id": "SCR-001-EV-001",
      "screen_id": "SCR-001",
      "type": "event",
      "summary": "認証成功→ホーム画面遷移"
    },
    {
      "id": "SCR-001-EV-002",
      "screen_id": "SCR-001",
      "type": "event",
      "summary": "認証失敗→エラーメッセージ表示"
    },
    {
      "id": "SCR-001-DT-001",
      "screen_id": "SCR-001",
      "type": "data",
      "summary": "POST /api/auth/login"
    },
    {
      "id": "SCR-001-DT-002",
      "screen_id": "SCR-001",
      "type": "data",
      "summary": "認証トークン保持"
    },
    {
      "id": "SCR-002-FN-001",
      "screen_id": "SCR-002",
      "type": "functional",
      "summary": "打刻メニュー選択"
    },
    {
      "id": "SCR-002-FN-002",
      "screen_id": "SCR-002",
      "type": "functional",
      "summary": "作業員管理メニュー選択"
    },
    {
      "id": "SCR-002-FN-003",
      "screen_id": "SCR-002",
      "type": "functional",
      "summary": "ログアウト"
    },
    {
      "id": "SCR-002-UI-001",
      "screen_id": "SCR-002",
      "type": "ui",
      "summary": "大きなメニューボタン配置"
    },
    {
      "id": "SCR-002-UI-002",
      "screen_id": "SCR-002",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-002-UI-003",
      "screen_id": "SCR-002",
      "type": "ui",
      "summary": "ログインユーザー名表示"
    },
    {
      "id": "SCR-002-VL-001",
      "screen_id": "SCR-002",
      "type": "validation",
      "summary": "未認証リダイレクト"
    },
    {
      "id": "SCR-002-EV-001",
      "screen_id": "SCR-002",
      "type": "event",
      "summary": "打刻ボタン→打刻モード選択画面遷移"
    },
    {
      "id": "SCR-002-EV-002",
      "screen_id": "SCR-002",
      "type": "event",
      "summary": "作業員管理ボタン→作業員一覧画面遷移"
    },
    {
      "id": "SCR-002-EV-003",
      "screen_id": "SCR-002",
      "type": "event",
      "summary": "ログアウト→ログイン画面遷移"
    },
    {
      "id": "SCR-002-DT-001",
      "screen_id": "SCR-002",
      "type": "data",
      "summary": "GET /api/user/me"
    },
    {
      "id": "SCR-003-FN-001",
      "screen_id": "SCR-003",
      "type": "functional",
      "summary": "出勤モード選択"
    },
    {
      "id": "SCR-003-FN-002",
      "screen_id": "SCR-003",
      "type": "functional",
      "summary": "退勤モード選択"
    },
    {
      "id": "SCR-003-UI-001",
      "screen_id": "SCR-003",
      "type": "ui",
      "summary": "大きな選択ボタン配置"
    },
    {
      "id": "SCR-003-UI-002",
      "screen_id": "SCR-003",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-003-UI-003",
      "screen_id": "SCR-003",
      "type": "ui",
      "summary": "現在日時表示"
    },
    {
      "id": "SCR-003-VL-001",
      "screen_id": "SCR-003",
      "type": "validation",
      "summary": "未認証リダイレクト"
    },
    {
      "id": "SCR-003-EV-001",
      "screen_id": "SCR-003",
      "type": "event",
      "summary": "出勤ボタン→作業員選択画面遷移"
    },
    {
      "id": "SCR-003-EV-002",
      "screen_id": "SCR-003",
      "type": "event",
      "summary": "退勤ボタン→作業員選択画面遷移"
    },
    {
      "id": "SCR-003-EV-003",
      "screen_id": "SCR-003",
      "type": "event",
      "summary": "戻る→ホーム画面遷移"
    },
    {
      "id": "SCR-003-DT-001",
      "screen_id": "SCR-003",
      "type": "data",
      "summary": "打刻モード状態保持"
    },
    {
      "id": "SCR-004-FN-001",
      "screen_id": "SCR-004",
      "type": "functional",
      "summary": "作業員一覧表示"
    },
    {
      "id": "SCR-004-FN-002",
      "screen_id": "SCR-004",
      "type": "functional",
      "summary": "個別チェックボックス選択"
    },
    {
      "id": "SCR-004-FN-003",
      "screen_id": "SCR-004",
      "type": "functional",
      "summary": "一括選択/一括解除"
    },
    {
      "id": "SCR-004-UI-001",
      "screen_id": "SCR-004",
      "type": "ui",
      "summary": "チェックボックス付きリスト表示"
    },
    {
      "id": "SCR-004-UI-002",
      "screen_id": "SCR-004",
      "type": "ui",
      "summary": "全選択/全解除チェックボックス"
    },
    {
      "id": "SCR-004-UI-003",
      "screen_id": "SCR-004",
      "type": "ui",
      "summary": "打刻モード表示"
    },
    {
      "id": "SCR-004-UI-004",
      "screen_id": "SCR-004",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-004-UI-005",
      "screen_id": "SCR-004",
      "type": "ui",
      "summary": "スマホ向け大きいタップUI"
    },
    {
      "id": "SCR-004-UI-006",
      "screen_id": "SCR-004",
      "type": "ui",
      "summary": "ページネーション/無限スクロール"
    },
    {
      "id": "SCR-004-VL-001",
      "screen_id": "SCR-004",
      "type": "validation",
      "summary": "1名以上選択必須"
    },
    {
      "id": "SCR-004-VL-002",
      "screen_id": "SCR-004",
      "type": "validation",
      "summary": "未認証リダイレクト"
    },
    {
      "id": "SCR-004-EV-001",
      "screen_id": "SCR-004",
      "type": "event",
      "summary": "次へ→撮影・送信画面遷移"
    },
    {
      "id": "SCR-004-EV-002",
      "screen_id": "SCR-004",
      "type": "event",
      "summary": "戻る→打刻モード選択画面遷移"
    },
    {
      "id": "SCR-004-DT-001",
      "screen_id": "SCR-004",
      "type": "data",
      "summary": "GET /api/workers"
    },
    {
      "id": "SCR-004-DT-002",
      "screen_id": "SCR-004",
      "type": "data",
      "summary": "選択状態保持"
    },
    {
      "id": "SCR-005-FN-001",
      "screen_id": "SCR-005",
      "type": "functional",
      "summary": "カメラ起動・写真撮影"
    },
    {
      "id": "SCR-005-FN-002",
      "screen_id": "SCR-005",
      "type": "functional",
      "summary": "写真プレビュー表示"
    },
    {
      "id": "SCR-005-FN-003",
      "screen_id": "SCR-005",
      "type": "functional",
      "summary": "撮り直し"
    },
    {
      "id": "SCR-005-FN-004",
      "screen_id": "SCR-005",
      "type": "functional",
      "summary": "打刻データ送信"
    },
    {
      "id": "SCR-005-FN-005",
      "screen_id": "SCR-005",
      "type": "functional",
      "summary": "クライアント側画像圧縮"
    },
    {
      "id": "SCR-005-UI-001",
      "screen_id": "SCR-005",
      "type": "ui",
      "summary": "カメラプレビュー領域"
    },
    {
      "id": "SCR-005-UI-002",
      "screen_id": "SCR-005",
      "type": "ui",
      "summary": "大きいタップボタン"
    },
    {
      "id": "SCR-005-UI-003",
      "screen_id": "SCR-005",
      "type": "ui",
      "summary": "打刻モード・対象人数表示"
    },
    {
      "id": "SCR-005-UI-004",
      "screen_id": "SCR-005",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-005-VL-001",
      "screen_id": "SCR-005",
      "type": "validation",
      "summary": "写真未撮影時送信不可"
    },
    {
      "id": "SCR-005-VL-002",
      "screen_id": "SCR-005",
      "type": "validation",
      "summary": "カメラ権限エラー表示"
    },
    {
      "id": "SCR-005-VL-003",
      "screen_id": "SCR-005",
      "type": "validation",
      "summary": "未認証リダイレクト"
    },
    {
      "id": "SCR-005-EV-001",
      "screen_id": "SCR-005",
      "type": "event",
      "summary": "撮影ボタン→写真撮影・プレビュー表示"
    },
    {
      "id": "SCR-005-EV-002",
      "screen_id": "SCR-005",
      "type": "event",
      "summary": "撮り直しボタン→カメラ再起動"
    },
    {
      "id": "SCR-005-EV-003",
      "screen_id": "SCR-005",
      "type": "event",
      "summary": "送信成功→完了画面遷移"
    },
    {
      "id": "SCR-005-EV-004",
      "screen_id": "SCR-005",
      "type": "event",
      "summary": "送信失敗→エラーメッセージ表示"
    },
    {
      "id": "SCR-005-EV-005",
      "screen_id": "SCR-005",
      "type": "event",
      "summary": "戻る→作業員選択画面遷移"
    },
    {
      "id": "SCR-005-DT-001",
      "screen_id": "SCR-005",
      "type": "data",
      "summary": "POST /api/punches"
    },
    {
      "id": "SCR-005-DT-002",
      "screen_id": "SCR-005",
      "type": "data",
      "summary": "クライアント側画像圧縮処理"
    },
    {
      "id": "SCR-006-FN-001",
      "screen_id": "SCR-006",
      "type": "functional",
      "summary": "送信完了メッセージ表示"
    },
    {
      "id": "SCR-006-FN-002",
      "screen_id": "SCR-006",
      "type": "functional",
      "summary": "ホームへ戻るボタン"
    },
    {
      "id": "SCR-006-UI-001",
      "screen_id": "SCR-006",
      "type": "ui",
      "summary": "完了メッセージ中央表示"
    },
    {
      "id": "SCR-006-UI-002",
      "screen_id": "SCR-006",
      "type": "ui",
      "summary": "大きいタップボタン"
    },
    {
      "id": "SCR-006-UI-003",
      "screen_id": "SCR-006",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-006-VL-001",
      "screen_id": "SCR-006",
      "type": "validation",
      "summary": "未認証リダイレクト"
    },
    {
      "id": "SCR-006-EV-001",
      "screen_id": "SCR-006",
      "type": "event",
      "summary": "ホームへ戻る→外注先ホーム画面遷移"
    },
    {
      "id": "SCR-006-DT-001",
      "screen_id": "SCR-006",
      "type": "data",
      "summary": "前画面からの送信成功情報表示"
    },
    {
      "id": "SCR-007-FN-001",
      "screen_id": "SCR-007",
      "type": "functional",
      "summary": "作業員一覧表示"
    },
    {
      "id": "SCR-007-FN-002",
      "screen_id": "SCR-007",
      "type": "functional",
      "summary": "新規追加画面遷移"
    },
    {
      "id": "SCR-007-FN-003",
      "screen_id": "SCR-007",
      "type": "functional",
      "summary": "編集画面遷移"
    },
    {
      "id": "SCR-007-FN-004",
      "screen_id": "SCR-007",
      "type": "functional",
      "summary": "作業員削除"
    },
    {
      "id": "SCR-007-UI-001",
      "screen_id": "SCR-007",
      "type": "ui",
      "summary": "リスト形式表示"
    },
    {
      "id": "SCR-007-UI-002",
      "screen_id": "SCR-007",
      "type": "ui",
      "summary": "ページネーション/無限スクロール"
    },
    {
      "id": "SCR-007-UI-003",
      "screen_id": "SCR-007",
      "type": "ui",
      "summary": "新規追加ボタン配置"
    },
    {
      "id": "SCR-007-UI-004",
      "screen_id": "SCR-007",
      "type": "ui",
      "summary": "編集・削除ボタン配置"
    },
    {
      "id": "SCR-007-UI-005",
      "screen_id": "SCR-007",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-007-UI-006",
      "screen_id": "SCR-007",
      "type": "ui",
      "summary": "スマホ向け大きいタップUI"
    },
    {
      "id": "SCR-007-VL-001",
      "screen_id": "SCR-007",
      "type": "validation",
      "summary": "削除確認ダイアログ"
    },
    {
      "id": "SCR-007-VL-002",
      "screen_id": "SCR-007",
      "type": "validation",
      "summary": "未認証リダイレクト"
    },
    {
      "id": "SCR-007-EV-001",
      "screen_id": "SCR-007",
      "type": "event",
      "summary": "新規追加→追加・編集画面（新規モード）"
    },
    {
      "id": "SCR-007-EV-002",
      "screen_id": "SCR-007",
      "type": "event",
      "summary": "編集→追加・編集画面（編集モード）"
    },
    {
      "id": "SCR-007-EV-003",
      "screen_id": "SCR-007",
      "type": "event",
      "summary": "削除確認OK→作業員削除"
    },
    {
      "id": "SCR-007-EV-004",
      "screen_id": "SCR-007",
      "type": "event",
      "summary": "戻る→ホーム画面遷移"
    },
    {
      "id": "SCR-007-DT-001",
      "screen_id": "SCR-007",
      "type": "data",
      "summary": "GET /api/workers"
    },
    {
      "id": "SCR-007-DT-002",
      "screen_id": "SCR-007",
      "type": "data",
      "summary": "DELETE /api/workers/{worker_id}"
    },
    {
      "id": "SCR-008-FN-001",
      "screen_id": "SCR-008",
      "type": "functional",
      "summary": "氏名入力・登録"
    },
    {
      "id": "SCR-008-FN-002",
      "screen_id": "SCR-008",
      "type": "functional",
      "summary": "連絡先入力・登録"
    },
    {
      "id": "SCR-008-FN-003",
      "screen_id": "SCR-008",
      "type": "functional",
      "summary": "資格有無入力・登録"
    },
    {
      "id": "SCR-008-FN-004",
      "screen_id": "SCR-008",
      "type": "functional",
      "summary": "講習受講履歴入力・登録"
    },
    {
      "id": "SCR-008-FN-005",
      "screen_id": "SCR-008",
      "type": "functional",
      "summary": "編集モード既存情報ロード・更新"
    },
    {
      "id": "SCR-008-UI-001",
      "screen_id": "SCR-008",
      "type": "ui",
      "summary": "フォーム縦並び配置"
    },
    {
      "id": "SCR-008-UI-002",
      "screen_id": "SCR-008",
      "type": "ui",
      "summary": "保存・キャンセルボタン配置"
    },
    {
      "id": "SCR-008-UI-003",
      "screen_id": "SCR-008",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-008-UI-004",
      "screen_id": "SCR-008",
      "type": "ui",
      "summary": "スマホ向け大きいタップUI"
    },
    {
      "id": "SCR-008-VL-001",
      "screen_id": "SCR-008",
      "type": "validation",
      "summary": "氏名必須入力"
    },
    {
      "id": "SCR-008-VL-002",
      "screen_id": "SCR-008",
      "type": "validation",
      "summary": "連絡先必須入力"
    },
    {
      "id": "SCR-008-VL-003",
      "screen_id": "SCR-008",
      "type": "validation",
      "summary": "未認証リダイレクト"
    },
    {
      "id": "SCR-008-EV-001",
      "screen_id": "SCR-008",
      "type": "event",
      "summary": "保存（新規）→作業員一覧画面遷移"
    },
    {
      "id": "SCR-008-EV-002",
      "screen_id": "SCR-008",
      "type": "event",
      "summary": "保存（編集）→作業員一覧画面遷移"
    },
    {
      "id": "SCR-008-EV-003",
      "screen_id": "SCR-008",
      "type": "event",
      "summary": "キャンセル→作業員一覧画面遷移"
    },
    {
      "id": "SCR-008-DT-001",
      "screen_id": "SCR-008",
      "type": "data",
      "summary": "GET /api/workers/{worker_id}"
    },
    {
      "id": "SCR-008-DT-002",
      "screen_id": "SCR-008",
      "type": "data",
      "summary": "POST /api/workers"
    },
    {
      "id": "SCR-008-DT-003",
      "screen_id": "SCR-008",
      "type": "data",
      "summary": "PUT /api/workers/{worker_id}"
    },
    {
      "id": "SCR-009-FN-001",
      "screen_id": "SCR-009",
      "type": "functional",
      "summary": "手動打刻登録"
    },
    {
      "id": "SCR-009-FN-002",
      "screen_id": "SCR-009",
      "type": "functional",
      "summary": "既存打刻修正"
    },
    {
      "id": "SCR-009-FN-003",
      "screen_id": "SCR-009",
      "type": "functional",
      "summary": "修正理由入力"
    },
    {
      "id": "SCR-009-UI-001",
      "screen_id": "SCR-009",
      "type": "ui",
      "summary": "作業員選択・日時・種別・理由入力欄配置"
    },
    {
      "id": "SCR-009-UI-002",
      "screen_id": "SCR-009",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-009-UI-003",
      "screen_id": "SCR-009",
      "type": "ui",
      "summary": "スマホ向け大きいタップUI"
    },
    {
      "id": "SCR-009-VL-001",
      "screen_id": "SCR-009",
      "type": "validation",
      "summary": "対象作業員必須選択"
    },
    {
      "id": "SCR-009-VL-002",
      "screen_id": "SCR-009",
      "type": "validation",
      "summary": "打刻日時必須・有効形式"
    },
    {
      "id": "SCR-009-VL-003",
      "screen_id": "SCR-009",
      "type": "validation",
      "summary": "打刻種別必須選択"
    },
    {
      "id": "SCR-009-VL-004",
      "screen_id": "SCR-009",
      "type": "validation",
      "summary": "修正理由必須入力"
    },
    {
      "id": "SCR-009-VL-005",
      "screen_id": "SCR-009",
      "type": "validation",
      "summary": "未認証リダイレクト"
    },
    {
      "id": "SCR-009-EV-001",
      "screen_id": "SCR-009",
      "type": "event",
      "summary": "送信成功→ホーム画面遷移"
    },
    {
      "id": "SCR-009-EV-002",
      "screen_id": "SCR-009",
      "type": "event",
      "summary": "キャンセル→ホーム画面遷移"
    },
    {
      "id": "SCR-009-DT-001",
      "screen_id": "SCR-009",
      "type": "data",
      "summary": "POST /api/punches/correction"
    },
    {
      "id": "SCR-010-FN-001",
      "screen_id": "SCR-010",
      "type": "functional",
      "summary": "ID/パスワードによるログイン認証"
    },
    {
      "id": "SCR-010-UI-001",
      "screen_id": "SCR-010",
      "type": "ui",
      "summary": "入力欄・ボタン中央配置"
    },
    {
      "id": "SCR-010-UI-002",
      "screen_id": "SCR-010",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-010-VL-001",
      "screen_id": "SCR-010",
      "type": "validation",
      "summary": "ID必須入力"
    },
    {
      "id": "SCR-010-VL-002",
      "screen_id": "SCR-010",
      "type": "validation",
      "summary": "パスワード必須入力"
    },
    {
      "id": "SCR-010-VL-003",
      "screen_id": "SCR-010",
      "type": "validation",
      "summary": "認証エラー表示"
    },
    {
      "id": "SCR-010-EV-001",
      "screen_id": "SCR-010",
      "type": "event",
      "summary": "認証成功→ダッシュボード遷移"
    },
    {
      "id": "SCR-010-EV-002",
      "screen_id": "SCR-010",
      "type": "event",
      "summary": "認証失敗→エラーメッセージ表示"
    },
    {
      "id": "SCR-010-DT-001",
      "screen_id": "SCR-010",
      "type": "data",
      "summary": "POST /api/admin/auth/login"
    },
    {
      "id": "SCR-010-DT-002",
      "screen_id": "SCR-010",
      "type": "data",
      "summary": "認証トークン保持"
    },
    {
      "id": "SCR-011-FN-001",
      "screen_id": "SCR-011",
      "type": "functional",
      "summary": "本日の稼働人数サマリー表示"
    },
    {
      "id": "SCR-011-FN-002",
      "screen_id": "SCR-011",
      "type": "functional",
      "summary": "直近アラート表示"
    },
    {
      "id": "SCR-011-FN-003",
      "screen_id": "SCR-011",
      "type": "functional",
      "summary": "各管理画面への遷移メニュー"
    },
    {
      "id": "SCR-011-FN-004",
      "screen_id": "SCR-011",
      "type": "functional",
      "summary": "ログアウト"
    },
    {
      "id": "SCR-011-UI-001",
      "screen_id": "SCR-011",
      "type": "ui",
      "summary": "サマリーカード/ウィジェット表示"
    },
    {
      "id": "SCR-011-UI-002",
      "screen_id": "SCR-011",
      "type": "ui",
      "summary": "アラートリスト表示"
    },
    {
      "id": "SCR-011-UI-003",
      "screen_id": "SCR-011",
      "type": "ui",
      "summary": "ナビゲーションメニュー"
    },
    {
      "id": "SCR-011-UI-004",
      "screen_id": "SCR-011",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-011-VL-001",
      "screen_id": "SCR-011",
      "type": "validation",
      "summary": "未認証・権限なしリダイレクト"
    },
    {
      "id": "SCR-011-EV-001",
      "screen_id": "SCR-011",
      "type": "event",
      "summary": "打刻履歴確認メニュー→打刻履歴確認画面遷移"
    },
    {
      "id": "SCR-011-EV-002",
      "screen_id": "SCR-011",
      "type": "event",
      "summary": "労働時間集計メニュー→労働時間集計画面遷移"
    },
    {
      "id": "SCR-011-EV-003",
      "screen_id": "SCR-011",
      "type": "event",
      "summary": "外注先企業登録メニュー→外注先企業登録画面遷移"
    },
    {
      "id": "SCR-011-EV-004",
      "screen_id": "SCR-011",
      "type": "event",
      "summary": "管理者ユーザー登録メニュー→管理者ユーザー登録画面遷移"
    },
    {
      "id": "SCR-011-EV-005",
      "screen_id": "SCR-011",
      "type": "event",
      "summary": "ログアウト→管理者ログイン画面遷移"
    },
    {
      "id": "SCR-011-DT-001",
      "screen_id": "SCR-011",
      "type": "data",
      "summary": "GET /api/admin/dashboard"
    },
    {
      "id": "SCR-012-FN-001",
      "screen_id": "SCR-012",
      "type": "functional",
      "summary": "日別・外注先別打刻履歴一覧表示"
    },
    {
      "id": "SCR-012-FN-002",
      "screen_id": "SCR-012",
      "type": "functional",
      "summary": "日付フィルタ絞り込み"
    },
    {
      "id": "SCR-012-FN-003",
      "screen_id": "SCR-012",
      "type": "functional",
      "summary": "外注先フィルタ絞り込み"
    },
    {
      "id": "SCR-012-FN-004",
      "screen_id": "SCR-012",
      "type": "functional",
      "summary": "写真サムネイル表示"
    },
    {
      "id": "SCR-012-FN-005",
      "screen_id": "SCR-012",
      "type": "functional",
      "summary": "写真拡大表示"
    },
    {
      "id": "SCR-012-FN-006",
      "screen_id": "SCR-012",
      "type": "functional",
      "summary": "打刻修正（工場側管理者）"
    },
    {
      "id": "SCR-012-UI-001",
      "screen_id": "SCR-012",
      "type": "ui",
      "summary": "フィルタ条件配置"
    },
    {
      "id": "SCR-012-UI-002",
      "screen_id": "SCR-012",
      "type": "ui",
      "summary": "テーブル形式表示"
    },
    {
      "id": "SCR-012-UI-003",
      "screen_id": "SCR-012",
      "type": "ui",
      "summary": "写真サムネイルリスト内表示"
    },
    {
      "id": "SCR-012-UI-004",
      "screen_id": "SCR-012",
      "type": "ui",
      "summary": "ページネーション/無限スクロール"
    },
    {
      "id": "SCR-012-UI-005",
      "screen_id": "SCR-012",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-012-VL-001",
      "screen_id": "SCR-012",
      "type": "validation",
      "summary": "日付フィルタ有効形式"
    },
    {
      "id": "SCR-012-VL-002",
      "screen_id": "SCR-012",
      "type": "validation",
      "summary": "打刻修正時の修正理由必須"
    },
    {
      "id": "SCR-012-VL-003",
      "screen_id": "SCR-012",
      "type": "validation",
      "summary": "未認証・権限なしリダイレクト"
    },
    {
      "id": "SCR-012-EV-001",
      "screen_id": "SCR-012",
      "type": "event",
      "summary": "フィルタ変更→履歴再取得"
    },
    {
      "id": "SCR-012-EV-002",
      "screen_id": "SCR-012",
      "type": "event",
      "summary": "サムネイルクリック→写真拡大"
    },
    {
      "id": "SCR-012-EV-003",
      "screen_id": "SCR-012",
      "type": "event",
      "summary": "打刻修正ボタン→修正フォーム表示"
    },
    {
      "id": "SCR-012-EV-004",
      "screen_id": "SCR-012",
      "type": "event",
      "summary": "打刻修正保存→一覧更新"
    },
    {
      "id": "SCR-012-DT-001",
      "screen_id": "SCR-012",
      "type": "data",
      "summary": "GET /api/admin/punches"
    },
    {
      "id": "SCR-012-DT-002",
      "screen_id": "SCR-012",
      "type": "data",
      "summary": "GET /api/admin/punches/{id}/photo"
    },
    {
      "id": "SCR-012-DT-003",
      "screen_id": "SCR-012",
      "type": "data",
      "summary": "PUT /api/admin/punches/{id}"
    },
    {
      "id": "SCR-012-DT-004",
      "screen_id": "SCR-012",
      "type": "data",
      "summary": "GET /api/admin/contractors"
    },
    {
      "id": "SCR-013-FN-001",
      "screen_id": "SCR-013",
      "type": "functional",
      "summary": "日次集計表示"
    },
    {
      "id": "SCR-013-FN-002",
      "screen_id": "SCR-013",
      "type": "functional",
      "summary": "月次集計表示"
    },
    {
      "id": "SCR-013-FN-003",
      "screen_id": "SCR-013",
      "type": "functional",
      "summary": "期間指定"
    },
    {
      "id": "SCR-013-FN-004",
      "screen_id": "SCR-013",
      "type": "functional",
      "summary": "CSVダウンロード"
    },
    {
      "id": "SCR-013-UI-001",
      "screen_id": "SCR-013",
      "type": "ui",
      "summary": "期間指定・集計単位選択欄"
    },
    {
      "id": "SCR-013-UI-002",
      "screen_id": "SCR-013",
      "type": "ui",
      "summary": "テーブル形式表示"
    },
    {
      "id": "SCR-013-UI-003",
      "screen_id": "SCR-013",
      "type": "ui",
      "summary": "CSVダウンロードボタン"
    },
    {
      "id": "SCR-013-UI-004",
      "screen_id": "SCR-013",
      "type": "ui",
      "summary": "ページネーション/無限スクロール"
    },
    {
      "id": "SCR-013-UI-005",
      "screen_id": "SCR-013",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-013-VL-001",
      "screen_id": "SCR-013",
      "type": "validation",
      "summary": "開始日必須・有効形式"
    },
    {
      "id": "SCR-013-VL-002",
      "screen_id": "SCR-013",
      "type": "validation",
      "summary": "終了日必須・有効形式・開始日以降"
    },
    {
      "id": "SCR-013-VL-003",
      "screen_id": "SCR-013",
      "type": "validation",
      "summary": "未認証・権限なしリダイレクト"
    },
    {
      "id": "SCR-013-EV-001",
      "screen_id": "SCR-013",
      "type": "event",
      "summary": "集計ボタン→集計結果表示"
    },
    {
      "id": "SCR-013-EV-002",
      "screen_id": "SCR-013",
      "type": "event",
      "summary": "CSVダウンロードボタン→ファイルDL"
    },
    {
      "id": "SCR-013-DT-001",
      "screen_id": "SCR-013",
      "type": "data",
      "summary": "GET /api/admin/labor-summary"
    },
    {
      "id": "SCR-013-DT-002",
      "screen_id": "SCR-013",
      "type": "data",
      "summary": "GET /api/admin/labor-summary/csv"
    },
    {
      "id": "SCR-014-FN-001",
      "screen_id": "SCR-014",
      "type": "functional",
      "summary": "外注先企業一覧表示"
    },
    {
      "id": "SCR-014-FN-002",
      "screen_id": "SCR-014",
      "type": "functional",
      "summary": "新規登録"
    },
    {
      "id": "SCR-014-FN-003",
      "screen_id": "SCR-014",
      "type": "functional",
      "summary": "編集"
    },
    {
      "id": "SCR-014-FN-004",
      "screen_id": "SCR-014",
      "type": "functional",
      "summary": "削除"
    },
    {
      "id": "SCR-014-UI-001",
      "screen_id": "SCR-014",
      "type": "ui",
      "summary": "リスト/テーブル形式表示"
    },
    {
      "id": "SCR-014-UI-002",
      "screen_id": "SCR-014",
      "type": "ui",
      "summary": "新規登録ボタン配置"
    },
    {
      "id": "SCR-014-UI-003",
      "screen_id": "SCR-014",
      "type": "ui",
      "summary": "編集・削除ボタン配置"
    },
    {
      "id": "SCR-014-UI-004",
      "screen_id": "SCR-014",
      "type": "ui",
      "summary": "モーダル/インラインフォーム"
    },
    {
      "id": "SCR-014-UI-005",
      "screen_id": "SCR-014",
      "type": "ui",
      "summary": "ページネーション/無限スクロール"
    },
    {
      "id": "SCR-014-UI-006",
      "screen_id": "SCR-014",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-014-VL-001",
      "screen_id": "SCR-014",
      "type": "validation",
      "summary": "企業名必須入力"
    },
    {
      "id": "SCR-014-VL-002",
      "screen_id": "SCR-014",
      "type": "validation",
      "summary": "削除確認ダイアログ"
    },
    {
      "id": "SCR-014-VL-003",
      "screen_id": "SCR-014",
      "type": "validation",
      "summary": "未認証・権限なしリダイレクト"
    },
    {
      "id": "SCR-014-EV-001",
      "screen_id": "SCR-014",
      "type": "event",
      "summary": "新規登録ボタン→入力フォーム表示"
    },
    {
      "id": "SCR-014-EV-002",
      "screen_id": "SCR-014",
      "type": "event",
      "summary": "保存ボタン→登録/更新・一覧更新"
    },
    {
      "id": "SCR-014-EV-003",
      "screen_id": "SCR-014",
      "type": "event",
      "summary": "編集ボタン→情報ロード・フォーム表示"
    },
    {
      "id": "SCR-014-EV-004",
      "screen_id": "SCR-014",
      "type": "event",
      "summary": "削除確認OK→削除・一覧更新"
    },
    {
      "id": "SCR-014-DT-001",
      "screen_id": "SCR-014",
      "type": "data",
      "summary": "GET /api/admin/contractors"
    },
    {
      "id": "SCR-014-DT-002",
      "screen_id": "SCR-014",
      "type": "data",
      "summary": "POST /api/admin/contractors"
    },
    {
      "id": "SCR-014-DT-003",
      "screen_id": "SCR-014",
      "type": "data",
      "summary": "PUT /api/admin/contractors/{id}"
    },
    {
      "id": "SCR-014-DT-004",
      "screen_id": "SCR-014",
      "type": "data",
      "summary": "DELETE /api/admin/contractors/{id}"
    },
    {
      "id": "SCR-015-FN-001",
      "screen_id": "SCR-015",
      "type": "functional",
      "summary": "ユーザーアカウント一覧表示"
    },
    {
      "id": "SCR-015-FN-002",
      "screen_id": "SCR-015",
      "type": "functional",
      "summary": "工場側管理者アカウント新規登録"
    },
    {
      "id": "SCR-015-FN-003",
      "screen_id": "SCR-015",
      "type": "functional",
      "summary": "外注先管理者アカウント新規発行"
    },
    {
      "id": "SCR-015-FN-004",
      "screen_id": "SCR-015",
      "type": "functional",
      "summary": "アカウント編集"
    },
    {
      "id": "SCR-015-FN-005",
      "screen_id": "SCR-015",
      "type": "functional",
      "summary": "アカウント削除（無効化）"
    },
    {
      "id": "SCR-015-UI-001",
      "screen_id": "SCR-015",
      "type": "ui",
      "summary": "リスト/テーブル形式表示"
    },
    {
      "id": "SCR-015-UI-002",
      "screen_id": "SCR-015",
      "type": "ui",
      "summary": "新規登録ボタン配置"
    },
    {
      "id": "SCR-015-UI-003",
      "screen_id": "SCR-015",
      "type": "ui",
      "summary": "編集・削除ボタン配置"
    },
    {
      "id": "SCR-015-UI-004",
      "screen_id": "SCR-015",
      "type": "ui",
      "summary": "モーダル/インラインフォーム"
    },
    {
      "id": "SCR-015-UI-005",
      "screen_id": "SCR-015",
      "type": "ui",
      "summary": "ページネーション/無限スクロール"
    },
    {
      "id": "SCR-015-UI-006",
      "screen_id": "SCR-015",
      "type": "ui",
      "summary": "レスポンシブWebデザイン"
    },
    {
      "id": "SCR-015-VL-001",
      "screen_id": "SCR-015",
      "type": "validation",
      "summary": "ユーザーID必須・重複不可"
    },
    {
      "id": "SCR-015-VL-002",
      "screen_id": "SCR-015",
      "type": "validation",
      "summary": "パスワード必須（新規時）"
    },
    {
      "id": "SCR-015-VL-003",
      "screen_id": "SCR-015",
      "type": "validation",
      "summary": "権限種別必須選択"
    },
    {
      "id": "SCR-015-VL-004",
      "screen_id": "SCR-015",
      "type": "validation",
      "summary": "外注先管理者時の所属企業必須"
    },
    {
      "id": "SCR-015-VL-005",
      "screen_id": "SCR-015",
      "type": "validation",
      "summary": "削除確認ダイアログ"
    },
    {
      "id": "SCR-015-VL-006",
      "screen_id": "SCR-015",
      "type": "validation",
      "summary": "未認証・権限なしリダイレクト"
    },
    {
      "id": "SCR-015-EV-001",
      "screen_id": "SCR-015",
      "type": "event",
      "summary": "新規登録ボタン→入力フォーム表示"
    },
    {
      "id": "SCR-015-EV-002",
      "screen_id": "SCR-015",
      "type": "event",
      "summary": "保存ボタン→登録/更新・一覧更新"
    },
    {
      "id": "SCR-015-EV-003",
      "screen_id": "SCR-015",
      "type": "event",
      "summary": "編集ボタン→情報ロード・フォーム表示"
    },
    {
      "id": "SCR-015-EV-004",
      "screen_id": "SCR-015",
      "type": "event",
      "summary": "削除確認OK→削除・一覧更新"
    },
    {
      "id": "SCR-015-EV-005",
      "screen_id": "SCR-015",
      "type": "event",
      "summary": "外注先管理者選択→所属企業選択欄表示"
    },
    {
      "id": "SCR-015-DT-001",
      "screen_id": "SCR-015",
      "type": "data",
      "summary": "GET /api/admin/users"
    },
    {
      "id": "SCR-015-DT-002",
      "screen_id": "SCR-015",
      "type": "data",
      "summary": "POST /api/admin/users"
    },
    {
      "id": "SCR-015-DT-003",
      "screen_id": "SCR-015",
      "type": "data",
      "summary": "PUT /api/admin/users/{id}"
    },
    {
      "id": "SCR-015-DT-004",
      "screen_id": "SCR-015",
      "type": "data",
      "summary": "DELETE /api/admin/users/{id}"
    },
    {
      "id": "SCR-015-DT-005",
      "screen_id": "SCR-015",
      "type": "data",
      "summary": "GET /api/admin/contractors（プルダウン用）"
    }
  ]
}",
  "screen_design_markdown": "---
screen_id: SCR-001
screen_name: 外注先ログイン画面
doc_type: screen_requirements
version: 1.0.0
depends_on:
  - system_requirements.md
---

## 概要
外注先管理者（職長など）がスマホ・タブレットからID/パスワードを入力してシステムにログインするための画面。
現場での利用を想定し、屋外でも操作しやすい大きめのUI部品を配置する。

## 要件一覧

### 機能要件
| トレースID | 要件内容 | 優先度 | 備考 |
|---|---|---|---|
| SCR-001-FN-001 | IDとパスワードによるログイン認証ができる | High | ID/パスワード認証（要件定義書 7章セキュリティ） |

### UI要件
| トレースID | 要件内容 | 備考 |
|---|---|---|
| SCR-001-UI-001 | ID入力欄・パスワード入力欄・ログインボタンを画面中央に配置する | |
| SCR-001-UI-002 | レスポンシブWebデザインでPC/スマホ両対応とする | 要件定義書 6章デザイン原則 |
| SCR-001-UI-003 | スマホ利用時はボタンを大きくタップしやすいUIとする | 屋外操作を考慮（要件定義書 6章） |

### バリデーション要件
| トレースID | 対象 | ルール |
|---|---|---|
| SCR-001-VL-001 | ID | 必須入力。空文字の場合はエラーメッセージを表示する |
| SCR-001-VL-002 | パスワード | 必須入力。空文字の場合はエラーメッセージを表示する |
| SCR-001-VL-003 | 認証 | ID/パスワードの組み合わせが不正な場合はエラーメッセージを表示する |

### イベント・遷移要件
| トレースID | トリガー | 挙動 |
|---|---|---|
| SCR-001-EV-001 | ログインボタン押下かつ認証成功 | 外注先ホーム画面（SCR-002）へ遷移する |
| SCR-001-EV-002 | ログインボタン押下かつ認証失敗 | 同画面にエラーメッセージを表示する |

### データ要件
| トレースID | 種別 | 内容 |
|---|---|---|
| SCR-001-DT-001 | API（送信） | POST /api/auth/login — リクエスト: { id, password }、レスポンス: { token, user_info } |
| SCR-001-DT-002 | ストレージ | 認証トークンをブラウザに保持する [ASSUMPTION] JWT等のトークン方式を想定 |

## 実装・テストへの引き継ぎ指示
- コード生成時は各実装箇所のコメントに対応するトレースIDを必ず記載すること
  例: `// trace: SCR-001-FN-001`
- テスト生成時はテスト名・describeにトレースIDを含めること
  例: `describe('SCR-001-VL-001: ID必須入力バリデーション', ...)`
- 1つの実装/テストが複数IDをカバーする場合はカンマ区切りで列挙すること

## 確認事項
- パスワードリセット機能の要否が要件定義書に記載なし。必要か確認が必要。
- ログイン失敗時のアカウントロック仕様（試行回数上限等）が未定。
"
}
```

## 入力ファイルの役割

### system_requirements

システム全体の要件・制約・アーキテクチャ・認証・データ・API・権限・既存実装方針などを定義したJSONです。

システム全体に関わる制約を確認するために使用してください。

### trace_index

画面ごとのTrace IDと、その要件概要を定義したJSONです。

対象画面に紐づくTraceを特定し、Trace ID・種別・要件概要を保持するために使用してください。

### screen_design_markdown

今回実装対象となる1画面の画面設計Markdown全文です。

画面固有の以下の情報を取得するために使用してください。

* 画面概要
* 目的
* 利用者
* UI
* レイアウト
* 入力項目
* 表示項目
* 操作
* イベント
* 画面遷移
* バリデーション
* エラー表示
* API
* データ
* 状態
* 権限制御
* 注記
* ASSUMPTION
* その他の画面固有仕様

Markdownの見出し、表、箇条書き、本文、コードブロック、注記など、すべてを解析対象としてください。

---

# Output

出力はJSONのみとしてください。

Markdownコードフェンス、説明文、コメント、前置き、後置きは禁止します。

基本構造は以下としてください。

```json
{
  "version": "1.0",
  "screen": {},
  "requirements": {
    "functional": [],
    "ui": [],
    "validation": [],
    "events": [],
    "data": [],
    "api": [],
    "state": []
  },
  "implementation": {},
  "acceptance": [],
  "tests": [],
  "ambiguities": [],
  "traceability": []
}
```

---

# 1. screen

対象画面の基本情報を格納してください。

形式:

```json
{
  "id": "SCR-001",
  "name": "外注先ログイン画面",
  "purpose": "画面の目的",
  "user": "外注先管理者",
  "related_screens": [
    "SCR-002"
  ]
}
```

## id

対象画面の画面ID。

`trace_index.json` と画面設計Markdownに記載されている画面IDを使用してください。

新しい画面IDを生成してはいけません。

## name

画面設計Markdownに記載されている画面名を使用してください。

## purpose

画面設計Markdownに記載された画面目的を簡潔に整理してください。

情報を勝手に追加しないでください。

## user

対象画面を利用するユーザーを設定してください。

画面設計Markdownに記載がある場合はそれを優先してください。

記載がない場合は `trace_index.json` の画面情報を使用してください。

## related_screens

対象画面から明示的に遷移する画面IDを格納してください。

例えば、

```text
認証成功 → SCR-002
```

と記載されている場合、

```json
"related_screens": ["SCR-002"]
```

としてください。

画面遷移から一意に導出できる画面IDのみを設定してください。

入力に存在しない画面IDを推測して追加してはいけません。

---

# 2. requirements

対象画面の要件をカテゴリ別に整理してください。

以下の7カテゴリを使用してください。

* functional
* ui
* validation
* events
* data
* api
* state

対象画面に該当するTraceが存在する場合、そのTrace IDを必ず保持してください。

---

# 3. functional

機能要件を格納してください。

形式:

```json
{
  "id": "SCR-001-FN-001",
  "action": "login_authentication",
  "condition": "id_and_password_input",
  "result": "authenticate_user"
}
```

Trace IDは変更してはいけません。

画面設計Markdownから具体的な機能仕様が取得できる場合は、実装可能な粒度で記述してください。

ただし、入力にない処理を推測してはいけません。

---

# 4. ui

UI要件を格納してください。

形式:

```json
{
  "id": "SCR-001-UI-001",
  "type": "layout",
  "description": "ID入力欄・パスワード入力欄・ログインボタンを画面中央に配置する"
}
```

画面設計Markdownに具体的なUI仕様がある場合、その具体性を保持してください。

例えば、

* 配置
* サイズ
* 表示条件
* ボタン
* 入力欄
* テーブル
* カード
* レスポンシブ
* モバイル対応
* 色
* 余白
* 表示順
* コンポーネント構成

などを削除・抽象化しないでください。

---

# 5. validation

バリデーション要件を格納してください。

形式:

```json
{
  "id": "SCR-001-VL-001",
  "target": "id",
  "rule": "required",
  "error": "ID未入力時にエラーメッセージを表示する"
}
```

入力条件・必須条件・形式条件・エラー条件を可能な限り具体的に保持してください。

例えば、

```text
開始日必須・有効形式
```

を単に、

```text
入力チェック
```

としてはいけません。

---

# 6. events

ユーザー操作やイベントによる処理・画面遷移を格納してください。

形式:

```json
{
  "id": "SCR-001-EV-001",
  "trigger": "login_button_click",
  "condition": "auth_success",
  "success": "SCR-002",
  "failure": null
}
```

画面遷移先は入力情報から一意に判定できる場合、画面IDとして構造化してください。

入力に記載されていない遷移先を推測してはいけません。

---

# 7. data

データ操作を格納してください。

形式:

```json
{
  "id": "SCR-001-DT-001",
  "operation": "send",
  "target": "auth_credentials",
  "description": "POST /api/auth/login によりIDとパスワードを送信する"
}
```

以下のような情報を具体的に保持してください。

* データ取得
* データ登録
* データ更新
* データ削除
* データ送信
* データ保持
* データ表示
* データ状態

APIについては `api` にも構造化してください。

---

# 8. api

対象画面で利用するAPIを格納してください。

形式:

```json
{
  "id": "SCR-001-DT-001",
  "method": "POST",
  "endpoint": "/api/auth/login",
  "request": {},
  "response": {},
  "error": {}
}
```

## 最重要ルール

APIの以下の情報は、入力ファイルに存在する場合のみ出力してください。

* HTTPメソッド
* endpoint
* request
* response
* query parameter
* path parameter
* error response
* authentication
* header
* body
* response structure

入力に、

```text
POST /api/auth/login
```

しか存在しない場合、勝手に、

```json
"request": {
  "id": "string",
  "password": "string"
}
```

などを生成してはいけません。

画面設計Markdownやsystem_requirements.jsonに具体的なrequest仕様がある場合のみ構造化してください。

---

# 9. state

画面・認証・フォームなどの状態を格納してください。

形式:

```json
{
  "id": "SCR-001-DT-002",
  "name": "auth_token",
  "storage": "browser_storage",
  "description": "認証トークンを保持する"
}
```

入力に状態保持仕様が存在する場合、その内容を保持してください。

---

# 10. 3ファイルの統合ルール

3つの入力を単純に連結するのではなく、対象画面について突合してください。

優先順位は以下とします。

### 優先順位

1. `system_requirements.json`
2. `trace_index.json`
3. `screen_design_markdown`

ただし、役割が異なる場合は以下の原則を使用してください。

* システム全体の制約 → `system_requirements.json`
* Trace IDと要件概要 → `trace_index.json`
* 画面固有の具体的なUI・操作・画面構成 → `screen_design_markdown`

---

# 11. 矛盾処理

3ファイル間で仕様が矛盾する場合、勝手にどちらかを削除してはいけません。

`ambiguities` に記録してください。

形式:

```json
{
  "id": "AMB-001",
  "target": "auth_token_storage_method",
  "conflict": {
    "system_requirements": "sessionStorageへのuser_id/role保持",
    "screen_design": "JWT等のトークン方式を想定"
  },
  "resolution": "system_requirements",
  "reason": "システム要件を優先する"
}
```

## resolution

以下のいずれかを基本としてください。

* `system_requirements`
* `trace_index`
* `screen_design`
* `manual_confirmation`

入力情報だけでは判断できない場合は `manual_confirmation` としてください。

---

# 12. ASSUMPTIONの扱い

画面設計Markdownに `[ASSUMPTION]` が存在する場合、その内容を仕様として確定扱いしてはいけません。

例えば、

```text
[ASSUMPTION] JWTによる認証トークンを使用
```

と記載されている場合、

```json
"storage": "JWT"
```

と確定してはいけません。

他の入力ファイルに確定仕様が存在する場合は、それを優先してください。

矛盾する場合は `ambiguities` に記録してください。

---

# 13. 入力に存在しない仕様の禁止

入力3ファイルに存在しない仕様を新規に作成してはいけません。

特に以下を推測して追加してはいけません。

* API
* HTTPメソッド
* APIレスポンス
* DB構造
* 認証方式
* JWT
* セッション
* Cookie
* localStorage
* sessionStorage
* IndexedDB
* タイムアウト
* リトライ
* アカウントロック
* パスワードリセット
* バリデーションルール
* エラーコード
* 権限
* 画面遷移
* コンポーネント
* デザイン仕様

ただし、入力情報から一意に導出できる構造化情報は整理して構いません。

例:

```text
認証成功 → SCR-002
```

から、

```json
"success": "SCR-002"
```

へ変換することは許可します。

---

# 14. acceptance

各TraceについてAcceptance Criteriaを作成してください。

形式:

```json
{
  "id": "AC-001",
  "requirement": "SCR-001-FN-001",
  "expected": "IDとパスワードを入力してログイン認証が行えること"
}
```

原則として、対象画面の各Traceに対して少なくとも1つのAcceptance Criteriaを作成してください。

Acceptance Criteriaは「実装されたかどうかを確認できる」具体性を持たせてください。

悪い例:

```text
入力チェックができること
```

良い例:

```text
IDが空の場合に必須入力エラーが表示されること
```

---

# 15. tests

Acceptance CriteriaおよびTraceを検証するTest Caseを生成してください。

形式:

```json
{
  "id": "TEST-001",
  "type": "validation",
  "requirement": "SCR-001-VL-001",
  "input": {
    "id": "",
    "password": "password123"
  },
  "steps": [
    "IDを空のままにする",
    "パスワードを入力する",
    "ログインボタンを押下する"
  ],
  "expected": "ID必須入力のエラーメッセージが表示される"
}
```

## Test Case生成ルール

テストは可能な限り実行可能な粒度にしてください。

以下の種類を必要に応じて使用してください。

* `rendering`
* `interaction`
* `functional`
* `validation`
* `navigation`
* `API`
* `state`
* `error`
* `authorization`

ただし、入力に存在しない仕様をテストとして追加してはいけません。

---

# 16. テスト入力の扱い

テスト用の値が画面設計やsystem_requirementsに存在する場合は、それを使用してください。

存在しない場合、テスト実行に必要な最小限のダミー値を使用して構いません。

ただし、ダミー値を実際の業務仕様として扱ってはいけません。

例えば、

```json
{
  "id": "test_user",
  "password": "test_password"
}
```

はテスト用入力値として使用できます。

ただし、

```text
パスワードは8文字以上
```

のような仕様を入力に存在しない状態で追加してはいけません。

---

# 17. Positive / Negative Test

入力仕様から成功条件と失敗条件が明確な場合、両方のテストを作成してください。

例えば、

```text
認証成功 → SCR-002
認証失敗 → エラーメッセージ
```

の場合、

* 認証成功テスト
* 認証失敗テスト

の両方を作成してください。

---

# 18. implementation

AIコーディング時に利用する実装方針を格納してください。

形式:

```json
{
  "system_reference": "system_requirements.json",
  "trace_reference": "trace_index.json",
  "screen_reference": "screen_design_markdown",
  "scope": [
    "SCR-001"
  ],
  "rules": [
    "existing_codebase_first",
    "reuse_existing_patterns",
    "minimal_change",
    "no_unrelated_refactoring"
  ]
}
```

以下のルールを基本ルールとして設定してください。

* `existing_codebase_first`
* `reuse_existing_patterns`
* `minimal_change`
* `no_unrelated_refactoring`

システム要件に別の実装ルールが定義されている場合は、その内容を優先してください。

---

# 19. AIコーディング向けの原則

このJSONは後工程でAIコーディングに使用されます。

そのため、以下を厳守してください。

### 原則1

入力に存在する仕様は可能な限り具体的に保持する。

### 原則2

Trace IDを変更しない。

### 原則3

Trace IDを統合しない。

### 原則4

Trace IDを削除しない。

### 原則5

Trace IDを新規生成しない。

### 原則6

API仕様を推測しない。

### 原則7

認証方式を推測しない。

### 原則8

画面遷移を推測しない。

### 原則9

バリデーションを推測しない。

### 原則10

Acceptance CriteriaとTest CaseをTraceに紐付ける。

---

# 20. traceability

各TraceとAcceptance Criteria、Test Caseの関係を格納してください。

形式:

```json
{
  "requirement": "SCR-001-FN-001",
  "acceptance": [
    "AC-001"
  ],
  "tests": [
    "TEST-011"
  ]
}
```

対象画面のすべてのTraceについて、原則として1件のTraceabilityを作成してください。

Traceに対するAcceptanceまたはTestが不要と判断した場合、その理由を `ambiguities` に記録してください。

---

# 21. Trace完全保持

`trace_index.json` に対象画面のTraceが存在する場合、原則としてすべて出力してください。

以下は禁止です。

* Traceの省略
* Traceの統合
* Traceの削除
* Trace IDの改名
* Trace IDの採番変更
* 類似Traceの統合
* AIによる不要な整理

対象画面に11件のTraceが存在する場合、11件すべてを保持してください。

---

# 22. 画面設計Markdownの完全解析

画面設計Markdownに記載された情報を、Markdownの表現形式に関係なく解析してください。

対象:

* 見出し
* 表
* 箇条書き
* 番号付きリスト
* 本文
* コードブロック
* 注記
* ASSUMPTION
* UI仕様
* 入力仕様
* イベント仕様
* API仕様
* 画面遷移
* 状態
* エラー仕様

Markdownの形式ではなく、意味を解析してください。

---

# 23. 情報の優先順位

同じ仕様が複数の入力に存在する場合、以下を基本としてください。

### Trace ID

`trace_index.json` を正とする。

### システム制約

`system_requirements.json` を正とする。

### 画面固有UI

`screen_design_markdown` を正とする。

### 画面固有操作

`screen_design_markdown` と `trace_index.json` を突合する。

### API

`system_requirements.json` または `screen_design_markdown` に具体的な仕様がある場合、それを使用する。

単にTrace Indexに、

```text
POST /api/example
```

とだけある場合、それ以上のrequest/response仕様を生成してはいけません。

---

# 24. 不足情報

実装・テストに必要な情報が入力に存在しない場合、勝手に補完してはいけません。

必要に応じて `ambiguities` に記録してください。

例:

```json
{
  "id": "AMB-001",
  "target": "api_error_response",
  "reason": "APIのエラーレスポンス形式が3つの入力ファイルに記載されていない",
  "resolution": "manual_confirmation"
}
```

---

# 25. JSON品質チェック

出力前に内部的に以下を確認してください。

### Check 1

対象画面のIDが正しい。

### Check 2

対象画面のTraceをすべて保持している。

### Check 3

すべてのTrace IDが元のIDと一致している。

### Check 4

各Traceがrequirements内の適切なカテゴリに存在する。

### Check 5

各TraceにAcceptance Criteriaが存在する。

### Check 6

各TraceにTest Caseが存在する。

### Check 7

traceabilityにすべてのTraceが存在する。

### Check 8

traceabilityのrequirement IDが実在するTrace IDと一致する。

### Check 9

traceabilityのacceptance IDが実在するAcceptance Criteriaと一致する。

### Check 10

traceabilityのtest IDが実在するTest Caseと一致する。

### Check 11

入力に存在しない仕様を追加していない。

### Check 12

APIのmethodやendpointを変更していない。

### Check 13

画面遷移先を勝手に変更していない。

### Check 14

ASSUMPTIONを確定仕様として扱っていない。

### Check 15

入力間の矛盾を見落としていない。

### Check 16

有効なJSONになっている。

---

# 最重要ルール

この変換の目的は、3つの入力ファイルから、**対象画面1画面をAIが実装・テストするために必要なScreen Specification JSONを生成すること**です。

最優先事項は以下です。

1. `system_requirements.json` をシステム制約の根拠として使用する
2. `trace_index.json` の対象画面Traceを完全保持する
3. 画面設計Markdownの具体的な画面仕様を保持する
4. 3つの入力を突合して矛盾を検出する
5. Trace → Acceptance → Testの関係を明確にする
6. API・画面遷移・バリデーション等の具体情報を保持する
7. 入力に存在しない仕様を推測して追加しない
8. ASSUMPTIONを確定仕様として扱わない
9. 不明点・矛盾は `ambiguities` に残す
10. 出力は有効なJSONのみとする
11. Trace IDを新規生成・変更・削除しない
12. このJSONだけを読んだAIでも、対象画面の実装・テスト方針を理解できる粒度を目指す
