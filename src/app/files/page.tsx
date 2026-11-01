'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderPlus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api, { staffService, studentsService, type StaffDto, type StudentDto } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

type FolderRow = { id: string; name: string; created_at: string };

function unwrap<T>(value: any): T {
  return value?.data?.data ?? value?.data ?? value;
}

export default function FilesPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderModal, setFolderModal] = useState(false);
  const [editFolder, setEditFolder] = useState<FolderRow | null>(null);
  const [folderName, setFolderName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<(StudentDto | StaffDto) & { kind: 'STUDENT' | 'STAFF' }>>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/files/folders');
      const rows = unwrap<FolderRow[]>(response) || [];
      setFolders(rows);
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadFolders(); }, []);

  const createFolder = async () => {
    const name = folderName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const response = await api.post('/api/v1/files/folders', { name });
      const created = unwrap<FolderRow>(response);
      setFolderModal(false); setFolderName('');
      await loadFolders();
    } finally { setSaving(false); }
  };

  const renameFolder = async () => {
    if (!editFolder?.name.trim()) return;
    setSaving(true);
    try { await api.put(`/api/v1/files/folders/${editFolder.id}`, { name: editFolder.name.trim() }); setEditFolder(null); await loadFolders(); } finally { setSaving(false); }
  };

  const deleteFolder = async (folder: FolderRow) => {
    if (!window.confirm(`Удалить папку «${folder.name}»? Все участники внутри будут удалены из папки.`)) return;
    await api.delete(`/api/v1/files/folders/${folder.id}`);
    await loadFolders();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#202735]">Файлы</h1>
        </div>
        <Button icon={FolderPlus} onClick={() => setFolderModal(true)}>Новая папка</Button>
      </div>

      <div className="space-y-5">
        <section className="rounded-2xl border border-[#e2e8ee] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-bold text-[#273142]">Папки</h2><span className="text-xs text-[#8b95a4]">{folders.length}</span></div>
          {loading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#467aff]" /></div> : folders.length === 0 ? <p className="p-5 text-sm text-[#8b95a4]">Папок пока нет.</p> : <div className="space-y-2">
            {folders.map((folder) => <div key={folder.id} className="group relative inline-flex min-w-[150px] flex-col items-center rounded-2xl p-4 text-center transition hover:bg-[#f5f7f9] sm:w-[170px]"><button onClick={() => router.push(`/files/${folder.id}`)} className="flex flex-col items-center"><img src="/folder-icon.png" alt="" className="h-20 w-20 object-contain transition group-hover:scale-105" /><span className="mt-2 max-w-full truncate font-semibold text-[#3c4655]">{folder.name}</span></button><div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100"><button onClick={() => setEditFolder(folder)} className="rounded-lg p-1.5 text-[#9aa4b2] hover:bg-white hover:text-[#467aff]" aria-label="Переименовать папку"><Pencil className="h-4 w-4" /></button><button onClick={() => void deleteFolder(folder)} className="rounded-lg p-1.5 text-[#9aa4b2] hover:bg-rose-50 hover:text-rose-600" aria-label="Удалить папку"><Trash2 className="h-4 w-4" /></button></div></div>)}
          </div>}
        </section>
      </div>

      <Modal isOpen={folderModal} onClose={() => setFolderModal(false)} title="Новая папка" footer={<><Button variant="secondary" onClick={() => setFolderModal(false)}>Отмена</Button><Button disabled={saving || !folderName.trim()} onClick={createFolder}>{saving ? 'Создание…' : 'Создать папку'}</Button></>}><Input autoFocus label="Название" value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Например, Олимпиада 2026" /></Modal>
      <Modal isOpen={Boolean(editFolder)} onClose={() => setEditFolder(null)} title="Переименовать папку" footer={<><Button variant="secondary" onClick={() => setEditFolder(null)}>Отмена</Button><Button disabled={saving || !editFolder?.name.trim()} onClick={() => void renameFolder()}>Сохранить</Button></>}><Input autoFocus label="Название" value={editFolder?.name || ''} onChange={(event) => setEditFolder((current) => current ? { ...current, name: event.target.value } : current)} /></Modal>
    </div>
  );
}
