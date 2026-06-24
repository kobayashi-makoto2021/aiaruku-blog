# aiaruku-blog

アイアルク（aiaruku.com）向けブログシステム。

詳細な設計は [doc/system-design.md](doc/system-design.md) 参照。

---

## アクセス解析機能を追加（2026-06-24）

Firestoreベースの独自アクセス解析を実装。GA4等の外部サービスを使わずFirebase内で完結。

### 仕組み

- 記事ページのHTMLに1行のトラッキングJSを自動埋め込み（`generatePostHtml` のテンプレートに追加）
- ページ表示時に Cloud Functions（`trackView`）へ `fetch` でPOST
- Cloud Function が `document.referrer` からアクセス元を分類し、Firestoreの `analyticsDaily/{YYYY-MM-DD_slug}` に `FieldValue.increment` で書き込み
- 管理画面に「アクセス解析」ページを追加（PV推移グラフ・アクセス元内訳・記事別ランキング）

### データ構造

```
analyticsDaily/{YYYY-MM-DD_slug}
  ├─ date: string
  ├─ slug: string
  ├─ views: number
  ├─ google: number   ← Google/Bing/Yahoo検索流入
  ├─ direct: number  ← 直接アクセス
  ├─ social: number  ← X/Facebook/Instagram等
  └─ other: number
```

### 注意点

- データ蓄積は実装日（2026-06-24）以降から
- トラッキングJSはブラウザ上で実行されるためボットは基本的にカウントされない
- `src/generator/index.ts`（管理画面デプロイ）と `functions/src/generator.ts`（予約投稿デプロイ）の2つのgeneratorに同じトラッキングコードが入っている
- Cloud Functions の trackView URL（`trackview-jzq4nhtjjq-an.a.run.app`）は `config.ts` の `trackViewUrl` で管理

---

## LP2026との連携方針（2026-05-06 決定）

### ゴール

ブログの更新を aiaruku.com の SEO 強化につなげる。

### ホスティング構成

| サイト | URL | Firebase プロジェクト |
|---|---|---|
| LP（ランディングページ） | https://aiaruku.com | aiaruku-lp-2026-77c53 |
| ブログ（本リポジトリ） | https://blog.aiaruku.com | aiaruku-blog |

**サブディレクトリ（aiaruku.com/blog/）案は見送り。**

理由：2つのリポジトリが同一 Firebase Hosting サイトにデプロイすると、deploy.ts が Hosting バージョンを丸ごと作り直す仕組み上、LP2026 のファイルを上書きしてしまう問題が解決困難なため。

### SEO 連携の方針

- **LP2026 → ブログ**：LP のナビゲーション・フッターに `blog.aiaruku.com` へのリンクを追加（未着手）
- **ブログ → LP2026**：記事内 CTA などで `aiaruku.com` への内部リンクを設置し、相互リンクで SEO 効果を高める（検討中）

### 残タスク

- [ ] LP2026 のナビ（`index.html` 113行目）にブログリンクを追加
- [ ] LP2026 のフッター（`index.html` 760行目）にブログリンクを追加
- [ ] ブログ記事からLPへの導線設計

### ブログ更新をLP2026のSEOに反映する方法（検討中）

ブログ記事を公開するたびに LP2026 側のコンテンツも自動更新することで、`aiaruku.com` のクロール頻度向上が狙える。

**実装イメージ：** `deploy.ts` を拡張し、ブログデプロイ後に Firebase Hosting REST API で LP2026 サイトの特定ページ（index.html の最新記事セクション、sitemap.xml 等）も差し替える。LP2026 プロジェクトへの書き込み権限は管理者アカウントで対応可能。

LP2026 上のブログ記事の位置づけが決まったタイミングで実装する。
