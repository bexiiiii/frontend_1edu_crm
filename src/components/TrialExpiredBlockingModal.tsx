'use client';

import { AlertTriangle, CreditCard, Headset } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TrialExpiredBlockingModalProps {
  isOpen: boolean;
  trialEndsAt: string | null;
  onChooseTariff: () => void;
  onContactSupport: () => void;
}

function formatTrialEndDate(value: string | null): string {
  if (!value) {
    return 'Не указана';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

export default function TrialExpiredBlockingModal({
  isOpen,
  trialEndsAt,
  onChooseTariff,
  onContactSupport,
}: TrialExpiredBlockingModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-140 flex items-end justify-center overflow-y-auto bg-[#0f172acc] p-0 backdrop-blur-[2px] sm:items-center sm:p-4 md:p-6">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-[#dbe2e8] bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.45)] sm:max-w-2xl sm:rounded-3xl sm:p-6 md:p-8">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff2f2] text-[#dc2626] sm:mb-5 sm:h-12 sm:w-12">
          <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>

        <h2 className="text-xl font-bold leading-tight text-[#1f2530] sm:text-2xl">Подписка истекла</h2>
        {trialEndsAt ? (
          <p className="mt-2 text-[13px] text-[#5d6676] sm:text-sm">
            Дата истечения: {formatTrialEndDate(trialEndsAt)}. Чтобы продолжить работу в CRM,
            необходимо оплатить или выбрать тариф.
          </p>
        ) : (
          <p className="mt-2 text-[13px] text-[#5d6676] sm:text-sm">
            Чтобы продолжить работу в CRM, необходимо оплатить или выбрать тариф.
          </p>
        )}

        <div className="mt-4 rounded-2xl border border-[#ffd9d9] bg-[#fff7f7] p-3 text-[13px] text-[#7f1d1d] sm:mt-5 sm:p-4 sm:text-sm">
          До активации тарифа основные функции системы будут недоступны: работа со студентами, расписанием,
          финансами и аналитикой.
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:mt-6 sm:flex sm:flex-row sm:gap-3">
          <Button onClick={onChooseTariff} className="w-full sm:w-auto" icon={CreditCard}>
            Выбрать тариф
          </Button>
          <Button variant="outline" onClick={onContactSupport} className="w-full sm:w-auto" icon={Headset}>
            Техподдержка
          </Button>
        </div>
      </div>
    </div>
  );
}