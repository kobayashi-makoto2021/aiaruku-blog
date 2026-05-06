# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HPごとにデプロイする汎用ブログシステムのテンプレート。新しいHPにブログを追加する際は `config.ts` を書き換えて既存のFirebaseプロジェクトにデプロイするだけで動く設計。詳細は [doc/system-design.md](doc/system-design.md) を参照。

## Stack

- **Firebase Authentication** — Googleログイン（Workspaceドメイン制限）
- **Cloud Firestore** — 記事・コメント・ユーザーデータ
- **Firebase Storage** — 画像ファイル
- **Firebase Hosting** — フロントエンド・管理画面
- **Cloud Functions** — SSR（SEOのためのサーバーサイドレンダリング）

## Configuration

`config.ts` がデプロイごとに変更する唯一のファイル。サイト名・URL・許可ドメイン・FirebaseプロジェクトIDをここで設定する。

## Architecture

### URL構成

```text
/blog/          — 記事一覧（公開）
/blog/:slug     — 個別記事（SSR via Cloud Functions）
/blog/admin/    — 管理画面（Firebase Auth必須）
```

### データモデル

- `posts` — 記事（title, slug, content HTML, status, SEOフィールド, tags）
- `comments` — コメント（承認制モデレーション）
- `users` — ユーザーとロール（admin / author / pending）

### 権限

- **admin**: 全記事の管理・ユーザー承認・ロール変更
- **author**: 自分の記事のCRUD

### SEO

- Cloud FunctionsがGooglebotに対してサーバーサイドレンダリングしたHTMLを返す
- 各記事にmeta/OGP/JSON-LD/canonicalを埋め込む
- `/blog/sitemap.xml` をCloud Functionで動的生成

### 既存HPへの組み込み

- **Firebase案件**: `firebase.json` のrewriteで `/blog/**` をCloud Functionへ振り分け
- **Vercel案件**: `vercel.json` のrewriteでFirebaseホスト先にプロキシ

## Commands

```bash
npm install          # 依存関係インストール
npm run dev          # 開発サーバー起動（管理画面: http://localhost:5173/admin/）
npm run build        # 本番ビルド（dist/ に出力）
npm run preview      # ビルド結果のプレビュー

firebase deploy --only hosting    # Hostingのみデプロイ
firebase deploy --only firestore  # Firestoreルールのみデプロイ
firebase deploy --only storage    # Storageルールのみデプロイ
firebase deploy                   # 全デプロイ
```
