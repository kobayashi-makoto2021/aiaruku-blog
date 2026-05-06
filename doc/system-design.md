# ブログシステム 設計書

作成日: 2026-04-19  
ステータス: 設計確定（実装前）

---

## 1. 概要

HPごとにデプロイする汎用ブログシステムのテンプレート。HPに追加するたびに `config.ts` を書き換えて既存のFirebaseプロジェクトにデプロイして使う。**HPごとに独立したサブドメイン**（`blog.example.com`）で運用する。Cloud Functionsは不使用。Googleサービス（Google Workspace + Firebase無料枠）で完結させる。

---

## 2. 要件

| 項目 | 内容 |
|---|---|
| 投稿者 | 10名程度（増加の可能性あり）。任意のGoogleアカウント対応 |
| 投稿頻度 | 週1回程度 |
| 画像 | 必須（ドラッグ&ドロップでアップロード） |
| エディタ | WYSIWYG（Markdown不要、非技術者対応） |
| SEO | メタタグ・OGP・JSON-LD・サイトマップ対応 |
| 管理画面UI | 日本語 |
| ホスティング | サブドメイン（`blog.example.com`）として独立運用 |
| デプロイ形態 | HPごとに独立デプロイ。`config.ts` を変えるだけで別HPに適用可能 |

---

## 3. 技術スタック

| 役割 | サービス | 理由 |
|---|---|---|
| 認証 | Firebase Authentication（Googleログイン） | Gmail・Workspaceアカウント問わず利用可、管理者承認制 |
| 記事データ | Cloud Firestore | 週1本ペースなら無料枠（50万読取/日）で永続運用可 |
| 画像ストレージ | Firebase Storage | 5GB無料、Firebase SDKと統合済み |
| ホスティング | Firebase Hosting | 静的HTMLを配信。CDN経由で高速・コールドスタートなし |

Cloud Functions不使用。公開時にクライアントサイドで静的HTMLを生成しFirebase Hosting REST APIでデプロイする。

---

## 4. URL構成とホスティング戦略

### 基本構成（全HP共通）

```
blog.example.com/          ← ブログ記事一覧（静的HTML）
blog.example.com/:slug     ← 個別記事（静的HTML、SEO完全対応）
blog.example.com/admin/    ← 管理画面（SPA・Firebase Auth必須）
blog.example.com/sitemap.xml ← 静的生成
```

### Firebase Hosting マルチサイト構成

既存FirebaseプロジェクトにブログをHostingサイトとして追加する。

```
Firebaseプロジェクト
  ├── default site: example.com（既存HP）
  └── blog site:   blog.example.com（このブログ）← 追加
```

`firebase.json` にサイトを追加するだけで既存HPを一切変更せずに導入できる。

### Vercel案件の場合

Vercelは既存HPのまま変更なし。ブログはFirebaseの独立サイトとして `blog.example.com` で運用する。

---

## 5. SEO対応

### 静的HTML生成（公開時）

投稿者が「公開」ボタンを押したタイミングで、ブラウザ上のJavaScriptが静的HTMLファイルを生成しFirebase Hosting REST APIを通じて配置する。Googlebotは完全なHTMLを受け取るためインデックスが即時かつ確実。

各記事HTMLに埋め込むSEO要素：

```html
<title>記事タイトル | サイト名</title>
<meta name="description" content="メタディスクリプション">
<meta property="og:title" content="記事タイトル">
<meta property="og:description" content="メタディスクリプション">
<meta property="og:image" content="OG画像URL">
<meta property="og:url" content="正規URL">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="正規URL">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "記事タイトル",
  "image": "OG画像URL",
  "datePublished": "公開日",
  "dateModified": "更新日",
  "author": { "@type": "Person", "name": "著者名" }
}
</script>
```

### サイトマップ

公開・更新・削除のたびに `sitemap.xml` を再生成してHostingに配置する。

### 管理画面で設定できるSEO項目

- メタタイトル（未入力時は記事タイトルを自動使用）
- メタディスクリプション
- OG画像（未設定時は記事内の最初の画像を自動使用）

---

## 6. 認証・権限設計

### ロール

| ロール | 権限 |
|---|---|
| **管理者（admin）** | 全記事の編集・削除、ユーザーのロール変更 |
| **投稿者（author）** | 自分の記事の作成・編集・削除、下書き保存、公開 |
| **保留（pending）** | 初回ログイン後の待機状態。管理者が承認するまで操作不可 |

- 任意のGoogleアカウント（Gmail・Workspace問わず）でログイン可能
- 新規ログインは自動的に `pending` として登録
- 管理者が `author` または `admin` に昇格させる
- ドメイン制限が必要な場合は `config.ts` の `allowedDomains` で指定

### 認証フロー

```
ユーザー → Googleログイン → Firestoreでロール確認
  → pending: 「承認待ち」画面を表示
  → author/admin: 管理画面へ
```

---

## 7. データ設計（Firestore）

### コレクション: `posts`

```
posts/{postId}
  - title: string          // 記事タイトル
  - slug: string           // URLスラッグ（日本語可。例: 会社の紹介）
  - content: string        // HTML（WYSIWYGエディタ出力）
  - excerpt: string        // 記事の抜粋（一覧表示用）
  - authorId: string       // FirebaseのUID
  - authorName: string     // 表示用著者名
  - status: 'draft' | 'published'
  - publishedAt: timestamp
  - updatedAt: timestamp
  - metaTitle: string      // SEO用タイトル（省略可）
  - metaDescription: string
  - ogImageUrl: string
  - tags: string[]         // タグ（複数可）
  - eyecatchUrl: string    // アイキャッチ画像
```

### コレクション: `comments`

```
comments/{commentId}
  - postId: string         // 対象記事ID
  - authorName: string     // 投稿者名（自由入力）
  - content: string        // コメント本文
  - status: 'pending' | 'approved' | 'rejected'
  - createdAt: timestamp
```

- 公開前に管理者が承認するモデレーションフロー
- スパム対策としてreCAPTCHA（Google）を導入

### コレクション: `users`

```
users/{uid}
  - email: string
  - displayName: string
  - role: 'admin' | 'author' | 'pending'
  - createdAt: timestamp
  - lastLoginAt: timestamp
```

---

## 8. 管理画面 機能仕様

### 記事一覧画面

- 自分の記事（投稿者）/ 全記事（管理者）を表示
- ステータス（下書き/公開済み）でフィルタ
- タイトル・著者・公開日・ステータスを表示

### 記事編集画面

- WYSIWYGエディタ（候補: Quill.js または TipTap）
  - 機能: 見出し(H2/H3)・太字・斜体・リンク・箇条書き・番号付きリスト・引用
  - 画像: ドラッグ&ドロップ → Firebase Storageへ自動アップロード → エディタ内に挿入
- URLスラッグ: タイトルから自動生成（手動変更可）
- SEO設定パネル: メタタイトル / メタディスクリプション / OG画像
- アイキャッチ画像アップロード
- 下書き保存 / 公開 ボタン

### 記事公開時の処理

```
「公開」ボタン
  → Firestoreのstatusを'published'に更新
  → 静的HTML生成（記事ページ + 一覧ページ + sitemap.xml）
  → Firebase Hosting REST APIでデプロイ
```

### ユーザー管理画面（管理者のみ）

- ユーザー一覧表示
- ロール変更（pending → author / author → admin）

---

## 9. 画像管理

### Firebase Storage パス設計

```text
blog-images/
  posts/{postId}/{filename}    // 記事内画像
  eyecatch/{postId}/{filename} // アイキャッチ
  og/{postId}/{filename}       // OG画像
```

### 制約

- アップロード可能なファイル形式: JPG / PNG / WebP / GIF
- 最大ファイルサイズ: 10MB
- Storageセキュリティルールで認証済みユーザーのみアップロード可

---

## 10. 非機能要件

| 項目 | 方針 |
|---|---|
| パフォーマンス | 静的HTMLをFirebase CDNで配信。コールドスタートなし |
| スケール | 週1本ペース想定。Firestore/Storageの無料枠で十分 |
| セキュリティ | FirestoreセキュリティルールでロールベースのCRUD制御 |
| バックアップ | Firestoreの自動バックアップ（Firebase Console設定） |

---

## 11. デプロイ時の設定項目

新しいHPにブログを追加する際に変更する唯一のファイル。

```ts
// config.ts
export const BLOG_CONFIG = {
  siteName: "〇〇株式会社",
  siteUrl: "https://blog.example.com",
  allowedDomains: [          // 空配列にすると全Googleアカウント許可
    "example.com",
    "example.co.jp"
  ],
  firebase: {
    projectId: "my-firebase-project",
    apiKey: "...",
    authDomain: "...",
    storageBucket: "...",
  }
}
```

---

## 12. 実装フェーズ（予定）

| フェーズ | 内容 |
| --- | --- |
| Phase 1 | Firebaseプロジェクト設定・マルチサイト構成・認証・Firestoreスキーマ・セキュリティルール |
| Phase 2 | 管理画面（記事CRUD・WYSIWYGエディタ・画像アップロード） |
| Phase 3 | 静的HTML生成・Firebase Hosting REST APIデプロイ処理 |
| Phase 4 | ブログ公開画面（一覧・個別記事・SEO要素の埋め込み・サイトマップ） |
| Phase 5 | コメント機能・ユーザー管理画面 |
