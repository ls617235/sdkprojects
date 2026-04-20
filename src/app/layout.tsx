import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SDK Share | 组件分享平台',
    template: '%s | SDK Share',
  },
  description:
    'SDK Share 是一个组件分享平台，支持用户上传前端代码并生成可嵌入的 JavaScript SDK。',
  keywords: [
    'SDK Share',
    '组件分享',
    'JavaScript SDK',
    '前端代码',
    '嵌入代码',
    'SDK 生成',
  ],
  authors: [{ name: 'SDK Share Team' }],
  generator: 'SDK Share',
  // icons: {
  //   icon: '',
  // },
  openGraph: {
    title: 'SDK Share | 组件分享平台',
    description:
      'SDK Share 是一个组件分享平台，支持用户上传前端代码并生成可嵌入的 JavaScript SDK。',
    url: '',
    siteName: 'SDK Share',
    locale: 'zh_CN',
    type: 'website',
    // images: [
    //   {
    //     url: '',
    //     width: 1200,
    //     height: 630,
    //     alt: 'SDK Share - 组件分享平台',
    //   },
    // ],
  },
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'Coze Code | Your AI Engineer is Here',
  //   description:
  //     'Build and deploy full-stack applications through AI conversation. No env setup, just flow.',
  //   // images: [''],
  // },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
