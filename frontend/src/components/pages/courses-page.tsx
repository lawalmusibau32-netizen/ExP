'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import type { Course, Department } from '@/lib/types';
import { Button, Card, ConfirmButton, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, SuccessBanner, formatDateTime } from '@/components/ui';

export function CoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('3');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [courses, deps] = await Promise.all([
        api.get<Course[]>('/api/courses'),
        api.get<Department[]>('/api/departments'),
      ]);
      setItems(courses);
      setDepartments(deps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
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
    setCode('');
    setCredits('3');
    setDescription('');
    setDepartmentId(departments[0]?.id ?? '');
    setModalOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setTitle(c.title);
    setCode(c.code);
    setCredits(String(c.credits ?? 3));
    setDescription(c.description ?? '');
    setDepartmentId(c.departmentId);
    setModalOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = { title, code, credits: Number(credits) || 0, description, departmentId };
      if (editing) {
        await api.put(`/api/courses/${editing.id}`, payload);
        setSuccess('Course updated');
      } else {
        await api.post('/api/courses', payload);
        setSuccess('Course created');
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
      await api.del(`/api/courses/${id}`);
      setSuccess('Course deleted');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <PageHeader title="Courses" subtitle="Manage courses and their departments" actions={<Button onClick={openCreate}>New Course</Button>} />

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
          <EmptyState label="No courses yet. Create your first one." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Code</th>
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">Department</th>
                  <th className="pb-3 pr-4 font-medium">Credits</th>
                  <th className="pb-3 pr-4 font-medium">Created</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 pr-4 font-mono text-xs text-zinc-500">{c.code}</td>
                    <td className="py-3 pr-4 font-medium text-zinc-900">{c.title}</td>
                    <td className="py-3 pr-4 text-zinc-500">{c.departmentName}</td>
                    <td className="py-3 pr-4 text-zinc-500">{c.credits}</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateTime(c.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => openEdit(c)}>Edit</Button>
                        <ConfirmButton onConfirm={() => remove(c.id)}>Delete</ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Course' : 'New Course'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Department *</Label>
            <Select required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Title *</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Data Structures" />
            </div>
            <div>
              <Label>Code *</Label>
              <Input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="CSC201" />
            </div>
          </div>
          <div>
            <Label>Credits</Label>
            <Input type="number" min={0} value={credits} onChange={(e) => setCredits(e.target.value)} />
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
