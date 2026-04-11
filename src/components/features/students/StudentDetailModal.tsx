/* eslint-disable @next/next/no-img-element */
import { Edit, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  STUDENT_GENDER_LABELS,
  STUDENT_STATUS_COLORS,
  STUDENT_STATUS_LABELS,
} from '@/constants/student';
import { useResolvedFileUrl } from '@/hooks/useResolvedFileUrl';
import type { StudentListItem } from '@/types/student';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentListItem | null;
  onEdit: () => void;
  onDelete: () => void;
  isMutating?: boolean;
}

function formatDate(value: string): string {
  if (!value) {
    return '—';
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const StudentDetailModal = ({
  isOpen,
  onClose,
  student,
  onEdit,
  onDelete,
  isMutating = false,
}: StudentDetailModalProps) => {
  const studentPhotoUrl = useResolvedFileUrl(student?.studentPhoto);

  if (!student) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Информация об ученике"
      footer={
        <>
          <Button variant="ghost" icon={Trash2} onClick={onDelete} disabled={isMutating}>
            Удалить
          </Button>
          <Button icon={Edit} onClick={onEdit} disabled={isMutating}>
            Редактировать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">ФИО</label>
            <p className="text-base font-semibold text-gray-900">{student.fullName}</p>
            <p className="mt-1 text-sm text-gray-500">{student.customer || 'Без заказчика'}</p>
          </div>

          {studentPhotoUrl ? (
            <img
              src={studentPhotoUrl}
              alt={student.fullName}
              className="h-20 w-20 rounded-2xl object-cover"
            />
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Статус</label>
          <span
            className={`inline-flex rounded-lg border px-3 py-1 text-sm font-medium ${STUDENT_STATUS_COLORS[student.status]}`}
          >
            {STUDENT_STATUS_LABELS[student.status]}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Телефон</label>
            <p className="text-base text-gray-900">{student.phone || '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Телефон ученика</label>
            <p className="text-base text-gray-900">{student.studentPhone || '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
            <p className="text-base text-gray-900">{student.email || '—'}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Дополнительные телефоны</label>
          <p className="text-base text-gray-900">
            {student.additionalPhones.length > 0 ? student.additionalPhones.join(', ') : '—'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Дата рождения</label>
            <p className="text-base text-gray-900">{formatDate(student.birthDate)}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Пол</label>
            <p className="text-base text-gray-900">
              {student.gender ? STUDENT_GENDER_LABELS[student.gender] : '—'}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Город</label>
            <p className="text-base text-gray-900">{student.city || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Родитель</label>
            <p className="text-base text-gray-900">{student.parentName || '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Телефон родителя</label>
            <p className="text-base text-gray-900">{student.parentPhone || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Школа</label>
            <p className="text-base text-gray-900">{student.school || '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Класс</label>
            <p className="text-base text-gray-900">{student.grade || '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Лояльность</label>
            <p className="text-base text-gray-900">{student.loyalty || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Договор</label>
            <p className="text-base text-gray-900">{student.contract || '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Скидка</label>
            <p className="text-base text-gray-900">{student.discount || '—'}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Госзаказ</label>
            <p className="text-base text-gray-900">{student.stateOrderParticipant ? 'Да' : 'Нет'}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Адрес</label>
          <p className="text-base text-gray-900">{student.address || '—'}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Дополнительная информация</label>
          <p className="whitespace-pre-wrap text-base text-gray-900">{student.additionalInfo || '—'}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Комментарий</label>
          <p className="whitespace-pre-wrap text-base text-gray-900">{student.comment || '—'}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Заметки</label>
          <p className="whitespace-pre-wrap text-base text-gray-900">{student.notes || '—'}</p>
        </div>
      </div>
    </Modal>
  );
};
