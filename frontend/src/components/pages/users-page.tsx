'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import type { Department, Role, User } from '@/lib/types';
import { Badge, Button, Card, ConfirmButton, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, SuccessBanner, formatDateTime } from '@/components/ui';

const ROLE_LABELS: Record<Role, string> = { ADMIN: 'Admin', LECTURER: 'Lecturer', STUDENT: 'Student' };

export function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');
  const [departmentId, setDepartmentId] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [users, deps] = await Promise.all([
        api.get<User[]>('/api/users'),
        api.get<Department[]>('/api/departments'),
      ]);
      setItems(users);
      setDepartments(deps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = roleFilter === 'ALL' ? items : items.filter((u) => u.role === roleFilter);

  const openCreate = () => {
    setEditing(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setRole('STUDENT');
    setDepartmentId(departments[0]?.id ?? '');
    setPassword('');
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setEmail(u.email);
    setRole(u.role);
    setDepartmentId(u.departmentId ?? '');
    setPassword('');
    setModalOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        firstName,
        lastName,
        email,
        role,
        departmentId: departmentId || null,
      };
      if (!editing) {
        if (!password) {
          setError('Password is required for new users');
          setSaving(false);
          return;
        }
        payload.password = password;
        await api.post('/api/users', payload);
        setSuccess('User created');
      } else {
        if (password) payload.password = password;
        await api.put(`/api/users/${editing.id}`, payload);
        setSuccess('User updated');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: User) => {
    setError(null);
    try {
      await api.put(`/api/users/${u.id}`, { isActive: !u.isActive });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await api.del(`/api/users/${id}`);
      setSuccess('User deleted');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage platform users" actions={<Button onClick={openCreate}>New User</Button>} />

      <ErrorBanner message={error} />
      {success && (
        <div className="mb-4">
          <SuccessBanner message={success} />
        </div>
      )}

      <Card>
        {loading ? (
          <Spinner />
        ) : (
          <div className="overflow-x-auto">
            <div className="mb-4 w-full sm:w-56">
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="ALL">All roles</option>
                <option value="ADMIN">Admins</option>
                <option value="LECTURER">Lecturers</option>
                <option value="STUDENT">Students</option>
              </Select>
            </div>
            {filtered.length === 0 ? (
              <EmptyState label="No users found." />
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Role</th>
                    <th className="pb-3 pr-4 font-medium">Department</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Last Login</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-3 pr-4 font-medium text-zinc-900">{u.fullName}</td>
                      <td className="py-3 pr-4 text-zinc-500">{u.email}</td>
                      <td className="py-3 pr-4">
                        <Badge label={ROLE_LABELS[u.role]} className="bg-indigo-50 text-indigo-700 border-indigo-200" />
                      </td>
                      <td className="py-3 pr-4 text-zinc-500">{u.departmentName ?? '-'}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          label={u.isActive ? 'Active' : 'Inactive'}
                          className={u.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}
                        />
                      </td>
                      <td className="py-3 pr-4 text-zinc-500">{formatDateTime(u.lastLoginAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" onClick={() => openEdit(u)}>Edit</Button>
                          <Button variant="secondary" onClick={() => toggleActive(u)}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <ConfirmButton onConfirm={() => remove(u.id)}>Delete</ConfirmButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'New User'}>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>First name *</Label>
              <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>Last name *</Label>
              <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Email *</Label>
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Role *</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="STUDENT">Student</option>
                <option value="LECTURER">Lecturer</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>{editing ? 'New password (leave blank to keep current)' : 'Password *'}</Label>
            <Input
              type="password"
              required={!editing}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={editing ? '••••••••' : ''}
            />
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
