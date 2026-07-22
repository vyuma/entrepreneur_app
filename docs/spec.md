# NueStar 機能拡張 仕様書 v1（確定版）

確定日: 2026-07-22

## 0. 前提・方針

- フロント: Next.js App Router / Tailwind v4。色は既存ブランドカラーのみを使用し、新規カラーは追加しない。
  - `--brand-green` / `--brand-green-soft` / `--brand-orange` / `--brand-orange-soft` / `--brand-blue` / `--brand-yellow`
- バック: FastAPI + SQLAlchemy + Alembic。既存 `user / activity / point_log / time_log` を拡張。
- 外部API: `https://nuestar.yuma-dev.uk`（コンペ情報 / 読み取り専用）。
  フロントからは直接叩かず、必ずバックエンドのプロキシ層を経由する。
  認証は `ADMIN_API_TOKEN`（`.env`）を `x-admin-token` ヘッダで送信する。
- Googleカレンダー連携は **スコープ外**（実装しない）。

### 確定事項

| 項目 | 決定 |
|---|---|
| v1 スコープ | 本書 1〜7 すべて |
| 応募エントリの公開範囲 | サークル内公開。編集は本人のみ。`memo` は本人と管理者のみ閲覧可 |
| 通知 | Discord のみ。Slack 連携は実装しない（スコープ外） |

---

## 1. コンペ機能

新規ページ `/competitions`（3タブ）

### 1-1. 一覧タブ
- データ: `GET /api/competitions?upcoming=true&sort=deadline`
- フィルタ: `type`（hackathon / bizcon / academia / startup / acceleration / networking）
- 各カード: 名称・主催・締切・開催日・会場・賞金・スコア
- 締切バッジ: 残り7日以内は `brand-orange`、それ以外は `brand-green`、超過はグレー

### 1-2. カレンダータブ
- 月表示（monthly）。前後月へ移動可。
- ドット表現:
  - 締切 = `brand-orange`
  - 開催日〜終了日 = `brand-green`
  - **自団体イベント（DB内 `internal_event`）= `brand-blue`（強調表示）**
- 日付クリックでその日の予定をパネル表示。

### 1-3. AI推薦タブ
- 自然文入力 → `GET /api/search?q=...&limit=50`。`interpretation` を解釈結果として表示。
- 加えてサーバ側で、ユーザーの過去 `activity` 種別・獲得ポイント帯・`competition_entry` 履歴から
  推薦クエリを自動生成し「あなた向け」枠を上部に表示する。

### 1-4. キャッシュ
- バックエンド `services/competitions.py` にプロキシ層。TTL 30分のメモリキャッシュ。
- 外部API障害時は最終成功レスポンスを返し、UI に「最終更新: 〜」を表示。

---

## 2. 応募トラッキング（応募 / 待つ / 成果）

### テーブル `competition_entry`

| 列 | 型 | 内容 |
|---|---|---|
| id | int PK | |
| user_id | FK users | |
| competition_id | int nullable | 外部APIのID |
| url | str | |
| name | str | 外部消滅対策のスナップショット |
| status | enum | `challenge`(応募) / `wait`(結果待ち) / `achieve`(成果) / `dropped` |
| memo | text nullable | 本人・管理者のみ閲覧 |
| result | text nullable | 受賞内容（achieve 時） |
| applied_at | datetime | |
| decided_at | datetime nullable | |

### 画面 `/achievements`
- 3カラムのカンバン（応募 / 待つ / 成果）。カード移動またはボタンで status 遷移。
- `dropped` は折りたたみ表示。
- `achieve` へ遷移した時点で **`activity` の下書きを自動生成** し、既存の管理者審査フローへ接続。
  承認後に既存ロジックでポイントが付与される。

---

## 3. ホーム（`/dashboard`）改修

- 左: 既存の作業時間カード（`TimeProgressCard` 流用）
- 右: 応募 / 待つ / 成果 のサマリーカード + 直近締切 3 件
- 週次アクティビティカレンダー（week 表示 / `brand-green` の濃淡）
- 右上「設定カード」: 表示カードの ON/OFF をユーザー設定として保存

### テーブル `user_dashboard_pref`
`user_id`, `card_key`, `visible`(bool), `order`(int)

---

## 4. メンバー / タレントマネジメント（`/members` 拡張）

- **タレントソート**: スキルタグ / 活動タイプ / ポイント / 受賞数でソート、グリッドカード表示
- **ランキング**: ポイント順位リスト。1位 `brand-yellow` / 2位 グレー / 3位 `brand-orange` アクセント
- スキルタグ: `user_skill`（`user_id`, `label`, `source` = `self` | `auto`）
  `auto` は成果・活動タイプから自動付与

---

## 5. ポートフォリオ自動生成

`/portfolio/[userId]`

- 活動実績・受賞（`competition_entry.achieve`）・作業時間ログを時系列で自動整形した1ページ
- 公開 / 非公開トグル（`users.portfolio_public`）。公開時のみ未ログインでも閲覧可
- 出力: Markdown コピー / 印刷CSS による PDF 出力

---

## 6. Discord 連携

- `/competitions` … 締切が近い順に3件
- `/entry <url>` … 応募エントリ登録
- 締切 3 日前リマインド
- `achieve` 登録時のお祝い通知

※ Slack 連携はスコープ外（実装しない）。

---

## 7. 実装順

1. DB & Alembic マイグレーション（`competition_entry` / `user_skill` / `user_dashboard_pref` / `internal_event` / `users.portfolio_public`）
2. 外部APIプロキシ + キャッシュ層（`services/competitions.py`）
3. `/competitions`（一覧・カレンダー・AI推薦）
4. `/achievements` カンバン → `activity` 連携
5. `/dashboard` 改修 / `/members` 拡張
6. `/portfolio/[userId]`
7. Discord コマンド拡張・通知
