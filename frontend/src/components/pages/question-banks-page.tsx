'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import type { Course, QuestionBank } from '@/lib/types';
import { Badge, Button, Card, ConfirmButton, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, SuccessBanner, formatDateTime } from '@/components/ui';

export function QuestionBanksPage() {
  const [items, setItems] = useState<QuestionBank[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBank | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [banks, allCourses] = await Promise.all([
        api.get<QuestionBank[]>('/api/question-banks'),
        api.get<Course[]>('/api/courses'),
      ]);
      setItems(banks);
      setCourses(allCourses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question banks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setCourseId(courses[0]?.id ?? '');
    setModalOpen(true);
  };

  const openEdit = (b: QuestionBank) => {
    setEditing(b);
    setTitle(b.title);
    setDescription(b.description ?? '');
    setCourseId(b.courseId);
    setModalOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { title, description, courseId };
      if (editing) {
        await api.put(`/api/question-banks/${editing.id}`, payload);
        setSuccess('Question bank updated');
      } else {
        await api.post('/api/question-banks', payload);
        setSuccess('Question bank created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await api.del(`/api/question-banks/${id}`);
      setSuccess('Question bank deleted');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <PageHeader title="Question Banks" subtitle="Organize questions by course" actions={<Button onClick={openCreate}>New Bank</Button>} />

      <ErrorBanner message={error} />
      {success && (
        <div className="mb-4">
          <SuccessBanner message={success} />
        </div>
      )}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState label="No question banks yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">Course</th>
                  <th className="pb-3 pr-4 font-medium">Questions</th>
                  <th className="pb-3 pr-4 font-medium">Created By</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Created</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((b) => (
                  <tr key={b.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-zinc-900">{b.title}</td>
                    <td className="py-3 pr-4 text-zinc-500">{b.courseTitle}</td>
                    <td className="py-3 pr-4 text-zinc-500">{b.questionCount}</td>
                    <td className="py-3 pr-4 text-zinc-500">{b.createdByName}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        label={b.isActive ? 'Active' : 'Inactive'}
                        className={b.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}
                      />
                    </td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateTime(b.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => openEdit(b)}>Edit</Button>
                        <ConfirmButton onConfirm={() => remove(b.id)}>Delete</ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Question Bank' : 'New Question Bank'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CSC201 Question Bank" />
          </div>
          <div>
            <Label>Course *</Label>
            <Select required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
