# aiaruku-blog

アイアルク（aiaruku.com）向けブログシステム。

詳細な設計は [doc/system-design.md](doc/system-design.md) 参照。

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
