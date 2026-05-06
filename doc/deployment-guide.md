# ブログシステム 導入ガイド

新しいHPにブログを追加する際の手順書です。

---

## 前提条件

- Google アカウント（Firebase プロジェクトを管理できるもの）
- Firebase プロジェクト（**Blaze プラン**必須 ※ Storage を使うため）
- Node.js 18以上
- Firebase CLI（`npm install -g firebase-tools`）

---

## 1. このリポジトリをクローン

```bash
git clone https://github.com/kobayashi-makoto2021/blog_system.git
cd blog_system
npm install
```

---

## 2. Firebase プロジェクトの準備

### 2-1. Firebase Console での設定

[Firebase Console](https://console.firebase.google.com/) を開き、以下を順番に有効化します。

| 機能 | 設定内容 |
|------|----------|
| **Authentication** | 「ログイン方法」→ Google を有効化 |
| **Firestore Database** | 「データベースを作成」→ 本番モードで作成 |
| **Storage** | 「始める」→ デフォルトの場所で作成 |
| **Hosting** | 「始める」→ ウィザードはスキップしてOK |

### 2-2. Firebase アプリの登録

1. Firebase Console → プロジェクトの設定 → 「マイアプリ」→ ウェブアプリを追加
2. 表示される設定オブジェクトをコピーしておく

```js
// コピーする内容の例
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

---

## 3. config.ts を書き換える

`src/config.ts` がデプロイごとに変更する**唯一のファイル**です。

```ts
export const BLOG_CONFIG = {
  // ブログのサイト名
  siteName: '株式会社〇〇 ブログ',

  // ブログのURL（サブドメインを使う場合はそのURL）
  siteUrl: 'https://blog.example.com',

  // ログインを許可するGoogleドメイン
  // 空配列にすると全Googleアカウントを許可
  allowedDomains: ['example.com'],
  // 例: ['example.com', 'example.co.jp']

  // 2-2 でコピーしたFirebase設定をここに貼り付ける
  firebase: {
    apiKey: 'AIza...',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project',
    storageBucket: 'your-project.firebasestorage.app',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123',
  },

  // Firebase Hosting のサイトID（通常はプロジェクトIDと同じ）
  hostingSiteId: 'your-project',
}
```

---

## 4. firebase.json のサイトIDを変更

```json
{
  "hosting": {
    "site": "your-project",  ← プロジェクトIDに変更
    ...
  }
}
```

---

## 5. .firebaserc を変更

```json
{
  "projects": {
    "default": "your-project"  ← プロジェクトIDに変更
  }
}
```

---

## 6. Firestore・Storage ルールをデプロイ

```bash
firebase login        # 初回のみ
firebase deploy --only firestore,storage
```

---

## 7. 管理画面をビルド＆デプロイ

```bash
npm run build
firebase deploy --only hosting
```

管理画面は `https://your-project.web.app/admin/` でアクセスできます。

---

## 8. 最初の管理者ユーザーを設定

1. `https://your-project.web.app/admin/` にアクセス
2. Google アカウントでログイン（「承認待ち」画面が出る）
3. Firebase Console → Firestore → `users` コレクション → 自分のドキュメントを開く
4. `role` フィールドを `pending` → `admin` に変更
5. ページをリロードすると管理画面に入れる

以後のユーザー追加は管理画面の「ユーザー」ページから行えます。

---

## 9. カスタムドメイン（サブドメイン）の設定

`blog.example.com` のようなサブドメインで運用する場合：

1. Firebase Console → Hosting → 「カスタムドメインを追加」
2. `blog.example.com` を入力
3. 表示される DNS レコード（TXTとCNAME）をドメイン管理会社に設定
4. 反映後（数分〜数時間）に `config.ts` の `siteUrl` をそのURLに変更して再デプロイ

---

## 10. 既存HPからブログへのリンク

サブドメインで運用する場合はシンプルにリンクするだけです。

```html
<a href="https://blog.example.com/">ブログ</a>
```

### Vercel の既存HPに組み込む場合

`vercel.json` にリダイレクトを追加することで `/blog/` 以下をFirebaseにプロキシできます。

```json
{
  "rewrites": [
    {
      "source": "/blog/:path*",
      "destination": "https://blog.example.com/:path*"
    }
  ]
}
```

### Firebase Hosting の既存HPに組み込む場合

既存の `firebase.json` に追記します。

```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/blog/**",
        "run": {
          "serviceId": "your-blog-project"
        }
      }
    ]
  }
}
```

---

## 運用チェックリスト

新しいHPに導入する際の確認リストです。

- [ ] `src/config.ts` を書き換えた
- [ ] `firebase.json` の site を変更した
- [ ] `.firebaserc` のプロジェクトIDを変更した
- [ ] Firebase Console で Auth・Firestore・Storage・Hosting を有効化した
- [ ] `firebase deploy --only firestore,storage` を実行した
- [ ] `npm run build && firebase deploy --only hosting` を実行した
- [ ] 最初の管理者ユーザーを Firestore Console で `admin` に昇格させた
- [ ] カスタムドメインを設定した（任意）
- [ ] テスト記事を作成して公開できることを確認した
