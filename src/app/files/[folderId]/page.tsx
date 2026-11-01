'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import api, { staffService, studentsService, type StaffDto, type StudentDto } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatFullName } from '@/lib/utils';

type FolderRow = { id: string; name: string };
type Member = { id: string; member_type: 'STUDENT' | 'STAFF'; member_id: string; display_name: string };
type Person = (StudentDto | StaffDto) & { kind: 'STUDENT' | 'STAFF' };
const unwrap = (value: any) => value?.data?.data ?? value?.data ?? value;

export default function FolderDetailsPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const router = useRouter();
  const [folder, setFolder] = useState<FolderRow | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person[]>([]);
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [folders, memberResponse] = await Promise.all([api.get('/api/v1/files/folders'), api.get(`/api/v1/files/folders/${folderId}/members`)]);
      setFolder((unwrap<FolderRow[]>(folders) || []).find((item) => item.id === folderId) || { id: folderId, name: 'Папка' });
      setMembers(unwrap<Member[]>(memberResponse) || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { if (folderId) void load(); }, [folderId]);

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const needle = query.trim().toLocaleLowerCase();
      const [students, staff] = await Promise.allSettled([
        studentsService.search({ query: needle, page: 0, size: 50 }),
        staffService.search({ query: needle, page: 0, size: 50 }),
      ]);
      let studentRows = students.status === 'fulfilled' ? (students.value.data?.content || []).map((x) => ({ ...x, kind: 'STUDENT' as const })) : [];
      let staffRows = staff.status === 'fulfilled' ? (staff.value.data?.content || []).map((x) => ({ ...x, kind: 'STAFF' as const })) : [];
      // Some CRM deployments only support exact search. Fall back to the full paginated lists.
      if (!studentRows.length) {
        const response = await studentsService.getAll({ page: 0, size: 500 });
        studentRows = (response.data?.content || []).filter((x) => formatFullName(x).toLocaleLowerCase().includes(needle)).map((x) => ({ ...x, kind: 'STUDENT' as const }));
      }
      if (!staffRows.length) {
        const response = await staffService.getAll({ page: 0, size: 500 });
        staffRows = (response.data?.content || []).filter((x) => formatFullName(x).toLocaleLowerCase().includes(needle)).map((x) => ({ ...x, kind: 'STAFF' as const }));
      }
      setResults([...studentRows, ...staffRows]);
    } finally { setSearching(false); }
  };
  const toggle = (person: Person) => setSelected((current) => current.some((x) => x.kind === person.kind && x.id === person.id) ? current.filter((x) => !(x.kind === person.kind && x.id === person.id)) : [...current, person]);
  const addSelected = async () => {
    await Promise.all(selected.map((person) => api.post(`/api/v1/files/folders/${folderId}/members`, { type: person.kind, memberId: person.id, displayName: formatFullName(person) })));
    setSelected([]); setResults([]); setQuery(''); setModal(false); await load();
  };
  const remove = async (member: Member) => { await api.delete(`/api/v1/files/folders/${folderId}/members/${member.id}`); await load(); };

  return <div className="space-y-5"><Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => router.push('/files')}>Все папки</Button><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[#8b95a4]">Общая папка</p><h1 className="text-2xl font-extrabold text-[#202735]">{folder?.name || 'Папка'}</h1></div><Button icon={Plus} onClick={() => setModal(true)}>Добавить участников</Button></div>{loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#467aff]" /></div> : <div className="overflow-x-auto rounded-2xl border border-[#e2e8ee] bg-white shadow-sm"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-[#f7f9fb] text-xs uppercase tracking-wide text-[#7d8796]"><tr><th className="px-5 py-4">Участник</th><th className="px-5 py-4">Тип</th><th className="px-5 py-4 text-right">Действия</th></tr></thead><tbody className="divide-y divide-[#edf0f3]">{members.map((member) => <tr key={member.id}><td className="px-5 py-4"><button onClick={() => router.push(`/${member.member_type === 'STUDENT' ? 'students' : 'staff'}/${member.member_id}`)} className="font-semibold text-[#315ed4]">{member.display_name}</button></td><td className="px-5 py-4 text-[#788394]">{member.member_type === 'STUDENT' ? 'Ученик' : 'Сотрудник'}</td><td className="px-5 py-4 text-right"><button onClick={() => void remove(member)} className="rounded-lg p-2 text-[#a0a9b5] hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table>{members.length === 0 && <p className="p-12 text-center text-sm text-[#8b95a4]">В этой папке пока нет участников.</p>}</div>}
    <Modal isOpen={modal} onClose={() => setModal(false)} title="Добавить участников" footer={<><Button variant="secondary" onClick={() => setModal(false)}>Отмена</Button><Button disabled={!selected.length} onClick={() => void addSelected()}>Добавить выбранных ({selected.length})</Button></>}><div className="flex gap-2"><Input className="flex-1" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} placeholder="Поиск учеников и сотрудников" /><Button icon={Search} onClick={() => void search()} disabled={searching}>Найти</Button></div><div className="mt-4 max-h-80 space-y-2 overflow-y-auto">{results.map((person) => { const checked = selected.some((x) => x.kind === person.kind && x.id === person.id); return <button key={`${person.kind}-${person.id}`} onClick={() => toggle(person)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${checked ? 'border-[#467aff] bg-[#edf3ff]' : 'border-[#e4e9ef]'}`}><span><span className="block font-semibold">{formatFullName(person)}</span><span className="text-xs text-[#8b95a4]">{person.kind === 'STUDENT' ? 'Ученик' : 'Сотрудник'}</span></span><span className={`h-5 w-5 rounded-full border-2 ${checked ? 'border-[#467aff] bg-[#467aff]' : 'border-[#ccd4df]'}`} /></button>; })}</div></Modal></div>;
}
