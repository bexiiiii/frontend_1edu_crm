'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Cake, Calendar, ChevronRight, ExternalLink, Search, Sparkles, User, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface BirthdayItem {
  kind: 'student' | 'staff';
  personId: string;
  studentId?: string;
  fullName: string;
  birthDate: string;
  turnsAge: number;
  daysUntil: number;
}

interface BirthdaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  birthdays: BirthdayItem[];
}

export function BirthdaysModal({ isOpen, onClose, birthdays }: BirthdaysModalProps) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'today_tomorrow' | 'week' | 'students' | 'staff'>('all');

  const counts = useMemo(() => {
    return {
      all: birthdays.length,
      todayTomorrow: birthdays.filter((b) => b.daysUntil <= 1).length,
      week: birthdays.filter((b) => b.daysUntil <= 7).length,
      students: birthdays.filter((b) => b.kind === 'student').length,
      staff: birthdays.filter((b) => b.kind === 'staff').length,
    };
  }, [birthdays]);

  const filteredBirthdays = useMemo(() => {
    let list = birthdays;

    if (activeFilter === 'today_tomorrow') {
      list = list.filter((b) => b.daysUntil <= 1);
    } else if (activeFilter === 'week') {
      list = list.filter((b) => b.daysUntil <= 7);
    } else if (activeFilter === 'students') {
      list = list.filter((b) => b.kind === 'student');
    } else if (activeFilter === 'staff') {
      list = list.filter((b) => b.kind === 'staff');
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((b) => b.fullName.toLowerCase().includes(q));
    }

    return list;
  }, [birthdays, activeFilter, search]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ближайшие дни рождения"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <Link
            href="/students"
            onClick={onClose}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#467aff] hover:underline"
          >
            <span>Перейти ко всей базе учеников</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Button variant="outline" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="grid grid-cols-2 gap-2 rounded-2xl border border-[#e1e9f3] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_100%)] p-3 sm:grid-cols-4">
          <div className="rounded-xl bg-white px-3 py-2 shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#8491a0]">Всего</p><p className="mt-1 text-lg font-bold text-[#27303c]">{counts.all}</p></div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Сегодня / завтра</p><p className="mt-1 text-lg font-bold text-emerald-800">{counts.todayTomorrow}</p></div>
          <div className="rounded-xl bg-indigo-50 px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">7 дней</p><p className="mt-1 text-lg font-bold text-indigo-800">{counts.week}</p></div>
          <div className="rounded-xl bg-blue-50 px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Ученики</p><p className="mt-1 text-lg font-bold text-blue-800">{counts.students}</p></div>
        </section>

        {/* Top filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#eef2f6] pb-3">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#467aff] text-white shadow-xs'
                : 'bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]'
            }`}
          >
            <span>Все</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[#e2e8f0] text-[#334155]'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('today_tomorrow')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === 'today_tomorrow'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Сегодня и завтра</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeFilter === 'today_tomorrow' ? 'bg-white/20 text-white' : 'bg-emerald-200/60 text-emerald-900'
              }`}
            >
              {counts.todayTomorrow}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('week')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === 'week'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Ближайшие 7 дней</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeFilter === 'week' ? 'bg-white/20 text-white' : 'bg-indigo-200/60 text-indigo-900'
              }`}
            >
              {counts.week}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('students')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === 'students'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <span>Ученики</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeFilter === 'students' ? 'bg-white/20 text-white' : 'bg-blue-200/60 text-blue-900'
              }`}
            >
              {counts.students}
            </span>
          </button>

          {counts.staff > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('staff')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFilter === 'staff'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              <span>Сотрудники</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  activeFilter === 'staff' ? 'bg-white/20 text-white' : 'bg-purple-200/60 text-purple-900'
                }`}
              >
                {counts.staff}
              </span>
            </button>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск именинника по ФИО..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="crm-input crm-input-with-icon text-xs sm:text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Cards list */}
        <div className="max-h-[480px] space-y-2.5 overflow-y-auto pr-1">
          {filteredBirthdays.length > 0 ? (
            filteredBirthdays.map((birthday) => {
              const profileHref =
                birthday.kind === 'staff'
                  ? `/staff/${birthday.personId}`
                  : `/students/${birthday.personId}`;

              const isToday = birthday.daysUntil === 0;
              const isTomorrow = birthday.daysUntil === 1;

              return (
                <Link
                  key={`${birthday.kind}-${birthday.personId}`}
                  href={profileHref}
                  onClick={onClose}
                  className={`group flex items-center justify-between rounded-xl border p-3.5 transition-all hover:shadow-md ${
                    isToday
                      ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-500 hover:bg-emerald-50'
                      : isTomorrow
                      ? 'border-blue-300 bg-blue-50/30 hover:border-blue-500 hover:bg-blue-50'
                      : 'border-[#e6ebf0] bg-white hover:border-[#467aff] hover:bg-[#f8fbfd]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-xs ${
                        isToday
                          ? 'bg-emerald-500 text-white'
                          : isTomorrow
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isToday ? (
                        <Cake className="h-5 w-5" />
                      ) : (
                        birthday.fullName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-gray-900 group-hover:text-[#467aff] transition-colors">
                          {birthday.fullName}
                        </span>
                        <span className="shrink-0 text-gray-400 group-hover:text-[#467aff] transition-colors">
                          <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 font-medium text-[11px] ${
                            birthday.kind === 'staff'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {birthday.kind === 'staff' ? 'Сотрудник' : 'Ученик'}
                        </span>
                        <span>•</span>
                        <span>{formatDate(birthday.birthDate)}</span>
                        <span>•</span>
                        <span>
                          Исполняется <strong className="font-semibold text-gray-800">{birthday.turnsAge}</strong> лет
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 ml-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                        isToday
                          ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400/40'
                          : isTomorrow
                          ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400/40'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {isToday ? 'Сегодня 🎉' : isTomorrow ? 'Завтра 🎂' : `Через ${birthday.daysUntil} дн.`}
                    </span>
                    <span className="hidden sm:inline-flex items-center text-xs font-medium text-[#467aff] opacity-0 group-hover:opacity-100 transition-opacity">
                      В карточку <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center text-sm text-gray-500">
              {search
                ? `По запросу «${search}» именинников не найдено.`
                : 'Нет дней рождения в выбранном фильтре.'}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
