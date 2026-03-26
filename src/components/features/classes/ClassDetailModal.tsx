import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { COURSE_FORMATS, COURSE_STATUSES, COURSE_TYPES } from '@/constants/class';
import type { CourseListItem } from '@/types/class';

interface ClassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  classData: CourseListItem | null;
  onEdit: () => void;
  onDelete: () => void;
  isMutating?: boolean;
}

function formatCurrency(value: number | null): string {
  if (value == null) {
    return '—';
  }

  return new Intl.NumberFormat('ru-RU').format(value);
}

export const ClassDetailModal = ({
  isOpen,
  onClose,
  classData,
  onEdit,
  onDelete,
  isMutating = false,
}: ClassDetailModalProps) => {
  if (!classData) {
    return null;
  }

  const typeConfig = COURSE_TYPES.find((item) => item.value === classData.type);
  const formatConfig = COURSE_FORMATS.find((item) => item.value === classData.format);
  const statusConfig = COURSE_STATUSES.find((item) => item.value === classData.status);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Информация о курсе"
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Название</label>
            <p className="text-base font-semibold text-gray-900">{classData.name}</p>
          </div>
          <div
            className="h-10 w-10 rounded-xl border border-[#dbe2e8]"
            style={{ backgroundColor: classData.color || '#ffffff' }}
            aria-hidden="true"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Тип</label>
            <p className="text-base text-gray-900">{typeConfig?.label ?? classData.type}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Формат</label>
            <p className="text-base text-gray-900">{formatConfig?.label ?? classData.format}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Статус</label>
            <span className={`inline-flex rounded-lg border px-3 py-1 text-sm font-medium ${statusConfig?.color ?? ''}`}>
              {statusConfig?.label ?? classData.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Преподаватель</label>
            <p className="text-base text-gray-900">{classData.teacherName}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Кабинет</label>
            <p className="text-base text-gray-900">{classData.roomName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Базовая цена</label>
            <p className="text-base text-gray-900">{formatCurrency(classData.basePrice)}</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Лимит учеников</label>
            <p className="text-base text-gray-900">{classData.enrollmentLimit ?? 'Не указан'}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Ученики курса</label>
          {classData.studentNames.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900">
                Всего прикреплено: {classData.studentNames.length}
              </p>
              <div className="flex flex-wrap gap-2">
                {classData.studentNames.map((studentName, index) => (
                  <span
                    key={`${studentName}-${index}`}
                    className="inline-flex rounded-lg border border-[#dbe2e8] bg-[#f8fafc] px-3 py-1 text-sm text-gray-700"
                  >
                    {studentName}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-base text-gray-900">Ученики не привязаны</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Описание</label>
          <p className="whitespace-pre-wrap text-base text-gray-900">{classData.description || '—'}</p>
        </div>
      </div>
    </Modal>
  );
};
