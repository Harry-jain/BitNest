import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from './contexts/ThemeProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'BitNest - Self-hosted Streaming & Storage Platform',
  description: 'A lightweight self-hosted streaming and file-storage platform for your mobile device',
  keywords: ['BitNest', 'streaming', 'file storage', 'self-hosted', 'mobile'],
  authors: [{ name: 'BitNest Team' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
} 