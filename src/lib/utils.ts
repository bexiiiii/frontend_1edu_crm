import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function formatFullName(person: {
  lastName?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  fullName?: string | null;
} | null | undefined): string {
  if (!person) return '';
  const composed = [person.lastName, person.firstName, person.middleName]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(' ');
  if (composed) return composed;
  return person.fullName?.trim() || '';
}
