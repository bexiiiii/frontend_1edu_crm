import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вход — EduCRM',
  description: 'Войдите в систему управления учебным центром',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
