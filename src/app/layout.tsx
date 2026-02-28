import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GBB 彩票分析',
  description: '彩票历史数据分析工具',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GBB 彩票分析',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1890ff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="h-full w-full overflow-hidden"
      style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                height: 100vh !important;
                width: 100vw !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
              }
              #root, #__next {
                height: 100vh !important;
                width: 100vw !important;
              }
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} h-full w-full`}
        style={{ height: '100vh', width: '100vw', margin: 0, padding: 0, overflow: 'hidden' }}
      >
        {children}
      </body>
    </html>
  );
}
