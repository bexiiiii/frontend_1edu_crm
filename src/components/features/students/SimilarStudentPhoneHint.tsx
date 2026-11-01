import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { studentsService, type StudentDto } from '@/lib/api';

const MIN_PHONE_DIGITS = 10;
const DEBOUNCE_MS = 500;

/** Last 10 digits: makes "+7 777 000 00 00", "87770000000" and "7770000000" comparable. */
function phoneKey(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  return digits.length >= MIN_PHONE_DIGITS ? digits.slice(-MIN_PHONE_DIGITS) : '';
}

function studentPhoneKeys(student: StudentDto): string[] {
  return [student.phone, student.studentPhone, student.parentPhone, ...(student.additionalPhones ?? [])]
    .map(phoneKey)
    .filter(Boolean);
}

function displayName(student: StudentDto): string {
  return [student.lastName, student.firstName, student.middleName].filter(Boolean).join(' ').trim()
    || student.fullName?.trim()
    || 'Без имени';
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
  const [result, setResult] = useState<{ key: string; students: StudentDto[] }>({ key: '', students: [] });
  const key = phoneKey(phone);

  useEffect(() => {
    if (!key) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const queries = Array.from(new Set([phone.trim(), key]));
      const found = new Map<string, StudentDto>();

      for (const query of queries) {
        try {
          const response = await studentsService.search({ query, page: 0, size: 10 });
          (response.data?.content ?? []).forEach((student) => {
            if (student.id !== excludeStudentId && studentPhoneKeys(student).includes(key)) {
              found.set(student.id, student);
            }
          });
        } catch {
          // The hint is optional: a failed lookup must never block the form.
        }
        if (cancelled) return;
        if (found.size > 0) break;
      }

      if (!cancelled) setResult({ key, students: Array.from(found.values()).slice(0, 3) });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, phone, excludeStudentId]);

  const matches = result.key === key ? result.students : [];
  if (!key || matches.length === 0) return null;

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
            <Link
              href={`/students/${student.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline hover:text-amber-700"
            >
              {displayName(student)}
            </Link>
          </span>
        </p>
      ))}
    </div>
  );
};
