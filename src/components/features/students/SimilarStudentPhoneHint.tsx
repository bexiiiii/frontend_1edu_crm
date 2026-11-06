import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { studentsService, type SimilarStudentDto } from '@/lib/api';
import { pushToast } from '@/lib/toast';

const MIN_PHONE_DIGITS = 10;
const DEBOUNCE_MS = 500;

/** Last 10 digits: makes "+7 777 000 00 00", "87770000000" and "7770000000" comparable. */
function phoneKey(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length >= MIN_PHONE_DIGITS ? digits.slice(-MIN_PHONE_DIGITS) : '';
}

function displayName(student: SimilarStudentDto): string {
  return student.fullName?.trim() || 'Без имени';
}

interface SimilarStudentPhoneHintProps {
  phone: string;
  /** The student being edited — never reported as a match of itself. */
  excludeStudentId?: string;
}

/**
 * Non-blocking hint: duplicate phone numbers are allowed (siblings share a parent phone),
 * so we only point the manager to an existing card with the same number.
 */
export const SimilarStudentPhoneHint = ({ phone, excludeStudentId }: SimilarStudentPhoneHintProps) => {
  // Results are tagged with the phone key they belong to, so stale ones are simply not shown.
  const [result, setResult] = useState<{ key: string; students: SimilarStudentDto[] }>({ key: '', students: [] });
  const key = phoneKey(phone);

  useEffect(() => {
    if (!key) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      let students: SimilarStudentDto[] = [];
      try {
        // Backend compares phones regardless of format; the request never shows a global error toast.
        const response = await studentsService.findSimilar(phone.trim(), excludeStudentId);
        students = (response.data ?? []).filter((student) => student.id !== excludeStudentId);
      } catch {
        // The hint is optional: a failed lookup must never block the form.
      }
      if (!cancelled) setResult({ key, students: students.slice(0, 3) });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, phone, excludeStudentId]);

  const [linking, setLinking] = useState<string | null>(null);
  const matches = result.key === key ? result.students : [];
  if (!key || matches.length === 0) return null;

  // A card of another branch cannot be opened here; link it to this branch
  // instead of creating a duplicate, then open it.
  const linkToBranch = async (student: SimilarStudentDto) => {
    setLinking(student.id);
    try {
      await studentsService.linkToCurrentBranch(student.id, phone.trim());
      setResult((current) => ({
        ...current,
        students: current.students.map((item) => (item.id === student.id ? { ...item, otherBranch: false } : item)),
      }));
      pushToast({ message: `${displayName(student)} добавлен(а) в ваш филиал`, tone: 'success' });
      window.open(`/students/${student.id}`, '_blank', 'noopener,noreferrer');
    } catch {
      // The API layer already shows the error.
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="mt-1.5 space-y-1">
      {matches.map((student) => (
        <p
          key={student.id}
          className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
        >
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            Похожий ученик:{' '}
            {student.otherBranch ? (
              <>
                <span className="font-medium">{displayName(student)}</span> — в другом филиале.{' '}
                <button
                  type="button"
                  disabled={linking === student.id}
                  onClick={() => void linkToBranch(student)}
                  className="font-medium underline hover:text-amber-700 disabled:opacity-60"
                >
                  {linking === student.id ? 'Добавляем…' : 'Добавить в мой филиал'}
                </button>
              </>
            ) : (
              <Link prefetch={false}
                href={`/students/${student.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:text-amber-700"
              >
                {displayName(student)}
              </Link>
            )}
          </span>
        </p>
      ))}
    </div>
  );
};
