import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Integration } from '@/types/settings-data';

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration | null;
}

export const IntegrationModal = ({ isOpen, onClose, integration }: IntegrationModalProps) => {
  if (!integration) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={integration.name}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-gray-600">
          Для этой интеграции настройка и сохранение параметров пока недоступны.
        </p>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Как только backend добавит контракт для интеграций, эту модалку можно будет подключить к API без локальных заглушек.
        </div>
      </div>
    </Modal>
  );
};
