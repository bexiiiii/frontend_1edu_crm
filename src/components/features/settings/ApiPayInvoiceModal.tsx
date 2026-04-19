'use client';

import { type ChangeEvent, useMemo, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  apiPayInvoicesService,
  studentsService,
  type ContactRecipientField,
  type GenerateApiPayInvoicesResponse,
  type StudentDto,
} from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { pushToast } from '@/lib/toast';

const RECIPIENT_FIELD_OPTIONS: Array<{ value: ContactRecipientField; label: string }> = [
  { value: 'PHONE', label: 'Телефон' },
  { value: 'STUDENT_PHONE', label: 'Телефон ученика' },
  { value: 'PARENT_PHONE', label: 'Телефон родителя' },
  { value: 'ADDITIONAL_PHONE_1', label: 'Доп. телефон №1' },
];

function getStudentDisplayName(student: StudentDto): string {
  return student.fullName || [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ') || student.email || student.phone || student.id;
}

function getPhoneValue(student: StudentDto, field: ContactRecipientField): string {
  switch (field) {
    case 'PHONE':
      return student.phone || '';
    case 'STUDENT_PHONE':
      return student.studentPhone || '';
    case 'PARENT_PHONE':
      return student.parentPhone || '';
    case 'ADDITIONAL_PHONE_1':
      return student.additionalPhones?.[0] || '';
  }
}

interface ApiPayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ApiPayInvoiceModal = ({ isOpen, onClose, onSuccess }: ApiPayInvoiceModalProps) => {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null);
  const [recipientField, setRecipientField] = useState<ContactRecipientField>('PHONE');
  const [amountMode, setAmountMode] = useState<'auto' | 'manual'>('auto');
  const [manualAmount, setManualAmount] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: studentsPage, loading: studentsLoading } = useApi(
    () => studentsService.getAll({ page: 0, size: 1000 }),
    []
  );

  const students = useMemo(() => studentsPage?.content ?? [], [studentsPage]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((s) => {
      const name = getStudentDisplayName(s).toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
  }, [students, search]);

  const selectedPhone = useMemo(() => {
    if (!selectedStudent) return '';
    return getPhoneValue(selectedStudent, recipientField);
  }, [selectedStudent, recipientField]);

  const handleGenerate = async () => {
    if (!selectedStudent) {
      pushToast({ message: 'Выберите ученика.', tone: 'error' });
      return;
    }

    if (!selectedPhone) {
      pushToast({ message: 'У выбранного ученика нет номера в поле «' + RECIPIENT_FIELD_OPTIONS.find(o => o.value === recipientField)?.label + '».', tone: 'error' });
      return;
    }

    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        studentId: selectedStudent.id,
        recipientField,
      };

      if (amountMode === 'manual') {
        const amountNum = parseFloat(manualAmount.replace(/\s/g, ''));
        if (Number.isNaN(amountNum) || amountNum <= 0) {
          pushToast({ message: 'Введите корректную сумму.', tone: 'error' });
          setGenerating(false);
          return;
        }
        body.amount = amountNum;
      }

      const response = await apiPayInvoicesService.generate(body as { month?: string; studentId?: string; recipientField?: string; amount?: number });
      const result = response.data as GenerateApiPayInvoicesResponse;
      pushToast({
        message: `Счета сгенерированы: ${result.generated} создано, ${result.skipped} пропущено, ${result.failed} ошибка`,
        tone: result.failed > 0 ? 'warning' : 'success',
      });
      onSuccess?.();
      handleClose();
    } catch {
      pushToast({ message: 'Не удалось сгенерировать счет.', tone: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedStudent(null);
    setSearch('');
    setManualAmount('');
    setAmountMode('auto');
    setRecipientField('PHONE');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Создать ApiPay счет">
      <div className="space-y-4">
        {/* Student selection */}
        <div>
          <label className="block text-sm font-medium text-[#1f2530]">Ученик</label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a94a3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени или телефону..."
              className="crm-input crm-input-with-icon pl-9"
            />
          </div>

          {selectedStudent ? (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-3 py-2">
              <span className="text-sm font-medium text-[#1f2530]">{getStudentDisplayName(selectedStudent)}</span>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-[#8a94a3] hover:text-[#ef4444]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : studentsLoading ? (
            <div className="mt-2 flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-[#467aff]" />
            </div>
          ) : (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#dbe2e8]">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => setSelectedStudent(student)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[#f0f4f8]"
                  >
                    <span className="flex-1 truncate text-[#1f2530]">{getStudentDisplayName(student)}</span>
                    {student.phone && <span className="text-xs text-[#8a94a3]">{student.phone}</span>}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-sm text-[#8a94a3]">Ученики не найдены</div>
              )}
            </div>
          )}
        </div>

        {/* Recipient field */}
        {selectedStudent && (
          <>
            <Select
              label="Куда отправлять счет"
              value={recipientField}
              onChange={(e) => setRecipientField(e.target.value as ContactRecipientField)}
            >
              {RECIPIENT_FIELD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            {selectedPhone && (
              <div className="rounded-xl border border-[#dbe2e8] bg-[#f8fbfd] px-4 py-3 text-sm">
                <p className="text-[#5d6676]">
                  Номер: <span className="font-medium text-[#1f2530]">{selectedPhone}</span>
                </p>
              </div>
            )}

            {/* Amount mode */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#1f2530]">Сумма</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAmountMode('auto')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    amountMode === 'auto'
                      ? 'border-[#467aff] bg-[#edf3ff] text-[#315fd0]'
                      : 'border-[#dbe2e8] bg-white text-[#5d6676] hover:bg-[#f8fbfd]'
                  }`}
                >
                  Авто (из абонемента)
                </button>
                <button
                  type="button"
                  onClick={() => setAmountMode('manual')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    amountMode === 'manual'
                      ? 'border-[#467aff] bg-[#edf3ff] text-[#315fd0]'
                      : 'border-[#dbe2e8] bg-white text-[#5d6676] hover:bg-[#f8fbfd]'
                  }`}
                >
                  Ввести вручную
                </button>
              </div>

              {amountMode === 'manual' && (
                <Input
                  type="text"
                  label="Сумма (KZT)"
                  value={manualAmount}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setManualAmount(e.target.value)}
                  placeholder="Например: 15000"
                />
              )}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleClose} disabled={generating}>
            Отмена
          </Button>
          <Button onClick={() => void handleGenerate()} disabled={generating || !selectedStudent}>
            {generating ? 'Создание...' : 'Создать счет'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
