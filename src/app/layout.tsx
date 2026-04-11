import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/AppShell';

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: '1edu crm - Система управления учебным центром',
  description: 'CRM система для управления учебными центрами',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${nunito.className} bg-[#f3f5f7] antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
