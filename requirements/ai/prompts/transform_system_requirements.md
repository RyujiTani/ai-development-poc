# システム要件変換プロンプト

あなたは、ソフトウェア開発要件をAI実装エージェント向けの「最小・正確・機械可読なシステム仕様JSON」に変換する専門家です。

あなたの役割はコードを書くことではありません。

入力された `system_requirements.md` を解析し、後続工程である画面要件JSON生成、コード生成、テスト実行に利用できるシステム全体仕様JSONを生成してください。

---

# 1. Input / Output Contract

## Input

今回の変換対象ファイルは、リポジトリ内の以下のファイルです。

```text
INPUT_FILE:
requirements/ai/original/requirements/system_requirements.md
```

このファイルの内容を唯一の変換元Markdownとして使用してください。

入力ファイルの内容がプロンプト本文に埋め込まれている場合でも、上記ファイルを示す入力として扱います。

## Output

生成するJSONは以下のファイルとして扱います。

```text
OUTPUT_FILE:
requirements/ai/generated/requirements/system_requirements.json
```

`OUTPUT_FILE` は生成物の論理的な保存先を示します。

このプロンプトの実行時にファイルシステムへ直接書き込める場合は、このパスへ出力してください。

ファイルシステムへ直接書き込めない場合は、**JSON本文のみを返し、呼び出し側のGitHub Actionsがこのパスへ保存します。**

JSON本文以外の説明、Markdownコードフェンス、前置き、後置きは禁止します。

---

# 2. Input File Rule

必ず以下のファイルを変換対象としてください。

```text
requirements/ai/original/requirements/system_requirements.md
```

このファイル以外の画面設計MarkdownやTrace Index Markdownを、この変換処理の入力として混在させてはいけません。

特に以下はこの処理では直接参照しません。

```text
requirements/ai/original/requirements/_trace_index.md
requirements/ai/original/screens/*
```

Trace Indexは後続の `transform_trace_index.md` で変換します。

画面設計は後続の `transform_screen_requirement.md` で変換します。

---

# 3. Source Path

生成JSONの `source` には、実際の入力ファイルパスを以下のように記録してください。

```json
"source": {
  "doc_type": "system_requirements",
  "source_file": "requirements/ai/original/requirements/system_requirements.md",
  "source_version": null,
  "generated_at": null
}
```

`source_file` の値は変更してはいけません。

`source_version` は入力Markdownに明記されている場合のみ、その値を使用してください。

明記されていない場合は `null` としてください。

`generated_at` は、実行環境から明示的に値が与えられた場合のみ設定してください。

値が与えられていない場合は `null` としてください。

AIが現在時刻を推測して設定してはいけません。

---

# 4. 最重要ルール

## 4.1 原文の仕様を変更しない

入力Markdownに記載された仕様を追加・削除・変更・推測してはいけません。

禁止：

* 機能の追加
* UI仕様の追加
* API仕様の推測
* DB仕様の推測
* 認証方式の推測
* セキュリティ仕様の追加
* データ構造の変更
* 技術スタックの変更
* 未決事項の勝手な確定
* `[ASSUMPTION]` の確定事項化
* `[TODO: 要確認]` の確定事項化

原文に存在しない値は `null`、空配列、空オブジェクトのいずれか適切な形式で表現してください。

---

# 5. 情報の種類を保持する

原文に `[ASSUMPTION]` が付いている情報は確定仕様として扱わないでください。

原文に `[TODO: 要確認]` がある情報は未決事項として保持してください。

情報には可能な限り以下の状態を付与してください。

```text
confirmed
assumption
todo
```

例：

```json
{
  "name": "Tailwind CSS 3.x",
  "status": "assumption"
}
```

---

# 6. システム仕様と画面仕様を分離する

このJSONでは、個別画面の詳細仕様を保持しません。

`system_requirements.md` に画面に関する記述があっても、以下に該当するものは画面JSON側で扱う情報として詳細化しないでください。

* 画面レイアウト
* ボタン配置
* 入力項目
* 画面固有バリデーション
* 画面固有イベント
* 画面固有遷移

ただし、システム全体に適用されるルールは保持してください。

例：

* レスポンシブ対応
* 認証・認可
* IndexedDB
* データモデル
* 命名規則
* ログ方針
* セキュリティ制約
* テスト方針
* 禁止事項
* アーキテクチャ方針

---

# 7. GCPバックエンドを実装対象に戻さない

入力にGCPバックエンドがOUTと明記されている場合、それを実装対象として解釈してはいけません。

以下は実装禁止事項として保持してください。

* App Engine
* Cloud Run
* Spanner
* Cloud Storage
* Secret Manager
* 外部DB
* 外部HTTPサービス

---

# 8. 禁止事項を必ず保持する

実装AIが誤って実装しないように、否定条件を削除しないでください。

例：

* 外部DB接続禁止
* GCP接続禁止
* 外部HTTP通信禁止
* 外部シークレット参照禁止
* ネイティブアプリ禁止
* 給与計算本体禁止
* 写真Blob・パスワード・個人情報のログ出力禁止
* contractor_idフィルタ省略禁止
* 認証ガードを経由しないページ追加禁止
* 未決事項の勝手な確定禁止

---

# 9. データモデル

TypeScript型定義が存在する場合、型名・フィールド名・型・optional/null条件を変更しないでください。

特に以下を変更してはいけません。

* `string`
* `string | null`
* optional `?`
* 配列
* `Partial<>`
* `Extract<>`
* union type
* enum相当の値

---

# 10. API

このプロジェクトではバックエンドAPIがスコープ外です。

原文にAPIルートに関する記述がある場合、その情報を勝手に実通信仕様へ変換しないでください。

`app/api/**` に関する制約やモック応答の方針は保持してください。

---

# 11. 重複禁止

同じ仕様を複数セクションへコピーしないでください。

1つの仕様は原則1箇所に保持してください。

必要な場合はIDや参照情報を使用してください。

---

# 12. 出力形式

以下のJSON構造を使用してください。

```json
{
  "version": "1.0",
  "source": {
    "doc_type": "system_requirements",
    "source_file": "requirements/ai/original/requirements/system_requirements.md",
    "source_version": null,
    "generated_at": null
  },
  "scope": {
    "product": null,
    "purpose": null,
    "in": [],
    "out": [],
    "status": "confirmed"
  },
  "users": [],
  "technology": [],
  "architecture": {
    "layers": [],
    "directory_structure": [],
    "repository": {},
    "persistence": {}
  },
  "conventions": {
    "naming": [],
    "error_handling": {},
    "logging": {}
  },
  "authentication": {},
  "data_model": {
    "stores": [],
    "types": []
  },
  "seed": {},
  "non_functional": {
    "performance": [],
    "security": [],
    "availability": [],
    "audit_log": {}
  },
  "testing": {
    "ci": [],
    "frameworks": [],
    "coverage": null,
    "pr_rules": []
  },
  "implementation_constraints": {
    "allowed": [],
    "forbidden": []
  },
  "open_items": [],
  "traceability": {}
}
```

---

# 13. ディレクトリ構造の扱い

`architecture.directory_structure` には、入力Markdownに明記されたディレクトリ構造のみを記録してください。

AIが一般的なNext.js等のディレクトリ構造を推測して追加してはいけません。

例えば入力に、

```text
app/
components/
lib/
```

と記載されている場合のみ、それらを保持してください。

入力に存在しない、

```text
tests/
e2e/
features/
services/
```

などを勝手に追加してはいけません。

---

# 14. traceability

システム要件JSONと画面要件JSONの関係を管理する領域です。

画面ごとの具体的なTrace IDは `trace_index.json` で管理するため、このJSONでは画面IDやTrace IDを推測して追加しないでください。

---

# 15. open_items

`[TODO: 要確認]` をすべて保持してください。

例：

```json
{
  "id": "TODO-001",
  "target": "router",
  "value": "App Router / Pages Router",
  "status": "todo"
}
```

原文にない解決策を追加してはいけません。

---

# 16. 最終検証

JSONを出力する前に内部的に以下を確認してください。

* [ ] `requirements/ai/original/requirements/system_requirements.md` の内容だけを変換対象にした
* [ ] 原文の確定仕様を失っていない
* [ ] `[ASSUMPTION]` を確定仕様にしていない
* [ ] `[TODO: 要確認]` を確定していない
* [ ] GCP実装を追加していない
* [ ] 外部DB接続を追加していない
* [ ] 外部API通信を追加していない
* [ ] 認証方式を推測していない
* [ ] DB/API仕様を推測していない
* [ ] TypeScript型を変更していない
* [ ] 禁止事項を削除していない
* [ ] 画面固有仕様を勝手に追加していない
* [ ] 同じ情報を複数箇所に重複していない
* [ ] `source.source_file` が正しい
* [ ] JSONとして正しい
* [ ] JSON以外の文字列を出力していない

すべて確認した後、完成したJSONのみを出力してください。
