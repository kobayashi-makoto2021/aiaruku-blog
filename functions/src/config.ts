// src/config.ts のミラー（functions 環境用）
export const BLOG_CONFIG = {
  siteName: 'アイアルク ブログ',
  siteUrl: 'https://blog.aiaruku.com',
  gaId: 'G-M1WN0Z0R6W',

  tagline: '「楽しい」から始める。「未来」につながる。',
  taglineSub: 'レッスンのようす・スクールからのお知らせをお届けします。',

  parentSiteUrl: 'https://aiaruku.com',
  parentSiteNav: [
    { label: '特徴', href: 'https://aiaruku.com/#features' },
    { label: 'コース', href: 'https://aiaruku.com/#courses' },
    { label: '料金', href: 'https://aiaruku.com/#pricing' },
    { label: '保護者の声', href: 'https://aiaruku.com/#testimonials' },
    { label: 'アクセス', href: 'https://aiaruku.com/#contact' },
  ] as { label: string; href: string }[],

  firebase: {
    apiKey: 'AIzaSyBptKp2uvjlaEqP3iZ3G7gygE1L5LMTyr4',
    authDomain: 'aiaruku-blog.firebaseapp.com',
    projectId: 'aiaruku-blog',
    storageBucket: 'aiaruku-blog.firebasestorage.app',
    messagingSenderId: '659368756457',
    appId: '1:659368756457:web:90906912c53eb507b81c78',
  },

  hostingSiteId: 'aiaruku-blog',
}
