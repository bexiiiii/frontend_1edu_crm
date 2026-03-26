import { AlertTriangle } from 'lucide-react';
import { SystemStateView } from '@/components/system/SystemStateView';

export default function NotFound() {
  return (
    <SystemStateView
      code="404"
      badge="Ошибка 404"
      title="Страница не найдена"
      description="Похоже, ссылка устарела или раздел был перемещен. Проверьте адрес и попробуйте снова."
      note="Если ошибка повторяется, перейдите в нужный раздел через меню."
      icon={AlertTriangle}
      tone="warning"
      actions={[
        { label: 'На главную', href: '/', variant: 'primary' },
        { label: 'Системные страницы', href: '/system', variant: 'secondary' },
      ]}
    />
  );
}

