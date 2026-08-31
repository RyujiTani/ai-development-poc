# Trace Index → Trace Index JSON Transformation

## Role

あなたは、システム要件・画面要件・Traceability情報を構造化データへ変換する専門家です。

Python実行環境から提供された `_trace_index.md` の内容を解析し、後続工程である画面要件仕様書のJSON化、コード実装、テストに利用できるTrace Index JSONを生成してください。

あなたの役割はコードを書くことではありません。

---

# 1. Input File Content

今回の変換対象は、Python実行環境から以下のプレースホルダに注入されたMarkdown本文です。

```text
TRACE_INDEX_MD:

{{TRACE_INDEX_MD}}
```

`{{TRACE_INDEX_MD}}` に含まれる内容を唯一の入力ソースとして扱ってください。

AI自身がファイルシステム、GitHubリポジトリ、外部ファイルを探索してはいけません。

プロンプト本文に記載されたファイルパスを直接読み込もうとしてはいけません。

---

# 2. Source File

生成JSONの `source.source_file` は以下の固定値を使用してください。

```text
requirements/ai/original/requirements/_trace_index.md
```

---

# 3. Output File

生成したJSONは、以下のファイルを生成するための内容として出力してください。

```text
requirements/ai/generated/requirements/trace_index.json
```

出力内容はJSONのみとしてください。

Markdownコードフェンス、説明文、コメント、前置き、後置きは禁止します。

GitHub Actions / Python側で、この出力を上記のパスへ保存します。

---

# 4. Input Processing

`TRACE_INDEX_MD` に存在するMarkdownの全文を解析対象としてください。

以下をすべて解析してください。

* Markdown見出し
* Markdown table
* 箇条書き
* 番号付きリスト
* 本文
* コードブロック
* 注記
* セクション単位のTrace一覧

特にMarkdown tableに記載されたTrace情報を漏らさないでください。

---

# 5. Output Structure

以下の構造を基本としてください。

```json
{
  "version": "1.0",
  "source": {
    "doc_type": "trace_index",
    "source_file": "requirements/ai/original/requirements/_trace_index.md",
    "source_version": null
  },
  "summary": {
    "total_screens": 0,
    "total_trace_ids": 0
  },
  "screens": [],
  "traces": []
}
```

---

# 6. source_version

`source_version` が入力MD内に明記されている場合は、その値を使用してください。

明記されていない場合は `null` としてください。

AIがバージョンを推測してはいけません。

---

# 7. summary

Trace Index全体の概要情報を格納します。

`total_screens` は入力MDから抽出したユニークな画面ID数と一致させてください。

`total_trace_ids` は実際に `traces` 配列へ格納したTraceの件数と一致させてください。

---

# 8. screens

画面単位の情報を格納します。

形式：

```json
{
  "id": "SCR-001",
  "name": "外注先ログイン画面",
  "user": "外注先管理者",
  "trace_count": 11
}
```

入力MDに記載されている情報をそのまま使用してください。

画面ID、画面名、利用者をAIの推測で変更してはいけません。

`trace_count` は、実際に `traces` 配列へ格納した該当画面のTrace数から計算してください。

---

# 9. traces

Trace IDは必ず1件ずつJSONオブジェクトとして出力してください。

基本形式：

```json
{
  "id": "SCR-001-FN-001",
  "screen_id": "SCR-001",
  "type": "functional",
  "summary": "ID/パスワードによるログイン認証"
}
```

---

# 10. Trace ID

入力MDに記載されているTrace IDを使用してください。

Trace IDを新規生成してはいけません。

Trace IDを変更してはいけません。

Trace IDを省略してはいけません。

同じ画面について複数のTraceが存在する場合、それぞれ独立したJSONオブジェクトとして出力してください。

---

# 11. screen_id

Traceが所属する画面IDを設定してください。

通常、Trace IDの先頭部分から判定できます。

入力MD上の関連付けが明示されている場合は、その情報を優先してください。

---

# 12. type

Trace IDのカテゴリを以下へ変換してください。

| Trace ID | JSON         |
| -------- | ------------ |
| `FN`     | `functional` |
| `UI`     | `ui`         |
| `VL`     | `validation` |
| `EV`     | `event`      |
| `DT`     | `data`       |

入力MDに存在しないカテゴリを推測して追加してはいけません。

---

# 13. summary

Traceの内容を、後続の画面実装・テストで利用できる程度に簡潔に記述してください。

入力MDに具体的な記述がある場合、その意味を維持してください。

以下の情報は削除・抽象化しないでください。

* APIエンドポイント
* HTTPメソッド
* 画面遷移先
* 入力条件
* 必須条件
* エラー条件
* 認証条件
* 権限制御
* データ取得
* データ登録
* データ更新
* データ削除
* UI上の具体的な制約

入力MDにない情報をsummaryへ追加してはいけません。

---

# 14. Traceの完全保持

入力MDに存在するTrace IDは、原則としてすべて `traces` に出力してください。

以下は禁止です。

* Traceの省略
* 類似Traceの統合
* 重複しているように見えるTraceの削除
* AIによる不要な整理
* AIによる勝手な分類変更
* AIによるTrace IDの改名
* AIによるTrace IDの採番変更

---

# 15. 原文優先

入力MDに記載されている情報を最優先してください。

一般的なWebアプリケーションの知識や一般的な設計慣習から、入力MDに存在しない仕様を追加してはいけません。

---

# 16. Markdown構造の扱い

Markdownの表現形式ではなく、記載されている意味を解析してください。

特に以下を漏らさないでください。

* 見出し
* Markdown table
* 箇条書き
* 番号付きリスト
* 本文
* コードブロック
* 注記
* Trace一覧

---

# 17. 画面とTraceの関連付け

各Traceには必ず `screen_id` を設定してください。

各画面の `trace_count` は、その画面に紐づく実際のTrace数と一致させてください。

---

# 18. 並び順

出力順序は入力MDの順序を基本的に維持してください。

`screens` は画面ID順ではなく、入力MDに登場する順序を優先してください。

`traces` はTrace IDの登場順を維持してください。

---

# 19. No Hallucination

入力MDに存在しない仕様を推測して追加してはいけません。

不明な情報を勝手に補完してはいけません。

---

# 20. JSON Quality Check

JSONを出力する前に内部的に以下を確認してください。

1. すべての画面が `screens` に存在する
2. すべてのTraceが `traces` に存在する
3. すべてのTraceに `id`、`screen_id`、`type`、`summary` が存在する
4. `summary.total_screens` と `screens` の件数が一致する
5. `summary.total_trace_ids` と `traces` の件数が一致する
6. 各画面の `trace_count` と実際のTrace数が一致する
7. すべての `trace.screen_id` が `screens[].id` に存在する
8. Trace IDを勝手に生成していない
9. Trace IDを変更していない
10. 入力MDに存在するTraceを省略していない
11. 入力MDに存在しない仕様を追加していない
12. JSONとして構文的に正しい

---

# 21. Final Output Rule

最終出力はJSONのみとしてください。

Markdownコードブロックは禁止します。

説明文は禁止します。

前置きは禁止します。

後置きは禁止します。

必ず `requirements/ai/generated/requirements/trace_index.json` として保存可能な有効JSONを出力してください。
