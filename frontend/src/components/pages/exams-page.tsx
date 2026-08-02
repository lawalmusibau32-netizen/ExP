'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import type { Course, Exam, Question, QuestionBank } from '@/lib/types';
import { Badge, Button, Card, ConfirmButton, EmptyState, ErrorBanner, EXAM_STATUS_STYLES, Input, Label, Modal, PageHeader, Select, Spinner, SuccessBanner, Textarea, formatDateTime } from '@/components/ui';

const STATUS_FLOW: { from: string[]; to: string; label: string }[] = [
  { from: ['DRAFT', 'SCHEDULED'], to: 'ACTIVE', label: 'Activate' },
  { from: ['DRAFT', 'SCHEDULED', 'ACTIVE'], to: 'CANCELLED', label: 'Cancel' },
];

export function ExamsPage({ scope }: { scope: 'admin' | 'lecturer' }) {
  const [items, setItems] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [questionBankId, setQuestionBankId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [passingScore, setPassingScore] = useState('50');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [maxTabSwitches, setMaxTabSwitches] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleChoices, setShuffleChoices] = useState(true);
  const [showResultsImmediately, setShowResultsImmediately] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const base = scope === 'admin' ? '/admin' : '/lecturer';

  const load = async () => {
    setLoading(true);
    try {
      const [exams, allCourses, allBanks] = await Promise.all([
        api.get<Exam[]>(scope === 'admin' ? '/api/exams' : '/api/exams/my'),
        api.get<Course[]>('/api/courses'),
        api.get<QuestionBank[]>('/api/question-banks'),
      ]);
      setItems(exams);
      setCourses(allCourses);
      setBanks(allBanks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [scope]);

  useEffect(() => {
    if (!questionBankId) {
      setBankQuestions([]);
      setSelectedQuestionIds(new Set());
      return;
    }
    api
      .get<Question[]>(`/api/questions/by-bank/${questionBankId}`)
      .then((qs) => {
        setBankQuestions(qs);
        setSelectedQuestionIds(new Set(qs.map((q) => q.id)));
      })
      .catch(() => setBankQuestions([]));
  }, [questionBankId]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCourseId(courses[0]?.id ?? '');
    setQuestionBankId(banks[0]?.id ?? '');
    setDurationMinutes('60');
    setPassingScore('50');
    setMaxAttempts('1');
    setMaxTabSwitches('');
    setShuffleQuestions(true);
    setShuffleChoices(true);
    setShowResultsImmediately(false);
    setStartTime('');
    setEndTime('');
    setSelectedQuestionIds(new Set());
    setOverrides({});
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const pointsOverrides: Record<string, number> = {};
      Object.entries(overrides).forEach(([qid, val]) => {
        const n = Number(val);
        if (selectedQuestionIds.has(qid) && val && !isNaN(n)) pointsOverrides[qid] = n;
      });
      const payload = {
        title,
        description,
        courseId,
        questionBankId,
        durationMinutes: Number(durationMinutes) || 1,
        passingScore: Number(passingScore) || 0,
        maxAttempts: Number(maxAttempts) || 1,
        maxTabSwitches: maxTabSwitches ? Number(maxTabSwitches) : null,
        shuffleQuestions,
        shuffleChoices,
        showResultsImmediately,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        questionIds: [...selectedQuestionIds],
        pointsOverrides,
      };
      await api.post('/api/exams', payload);
      setSuccess('Exam created');
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (ex: Exam, status: string) => {
    setError(null);
    try {
      await api.patch(`/api/exams/${ex.id}/status`, { status });
      setSuccess(`Exam ${status === 'ACTIVE' ? 'activated' : 'cancelled'}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status change failed');
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await api.del(`/api/exams/${id}`);
      setSuccess('Exam deleted');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <PageHeader title="Exams" subtitle={scope === 'admin' ? 'All exams on the platform' : 'Exams you created'} actions={<Button onClick={openCreate}>New Exam</Button>} />

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
          <EmptyState label="No exams yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="pb-3 pr-4 font-medium">Title</th>
                  <th className="pb-3 pr-4 font-medium">Course</th>
                  <th className="pb-3 pr-4 font-medium">Duration</th>
                  <th className="pb-3 pr-4 font-medium">Starts</th>
                  <th className="pb-3 pr-4 font-medium">Ends</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ex) => (
                  <tr key={ex.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-3 pr-4 font-medium text-zinc-900">{ex.title}</td>
                    <td className="py-3 pr-4 text-zinc-500">{ex.courseTitle}</td>
                    <td className="py-3 pr-4 text-zinc-500">{ex.durationMinutes} min</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateTime(ex.startTime)}</td>
                    <td className="py-3 pr-4 text-zinc-500">{formatDateTime(ex.endTime)}</td>
                    <td className="py-3 pr-4">
                      <Badge label={ex.status} className={EXAM_STATUS_STYLES[ex.status]} />
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`${base}/exams/${ex.id}`} className="text-sm font-medium text-indigo-600 hover:underline">View</Link>
                        {STATUS_FLOW.filter((f) => f.from.includes(ex.status)).map((f) => (
                          <Button key={f.to} variant="secondary" onClick={() => changeStatus(ex, f.to)}>{f.label}</Button>
                        ))}
                        <ConfirmButton onConfirm={() => remove(ex.id)}>Delete</ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Exam" wide>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mid-term Examination" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Course *</Label>
              <Select required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Question bank *</Label>
              <Select required value={questionBankId} onChange={(e) => setQuestionBankId(e.target.value)}>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <Label>Duration (min) *</Label>
              <Input required type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
            </div>
            <div>
              <Label>Pass % *</Label>
              <Input required type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(e.target.value)} />
            </div>
            <div>
              <Label>Max attempts</Label>
              <Input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
            </div>
            <div>
              <Label>Max tab switches</Label>
              <Input type="number" min={1} value={maxTabSwitches} onChange={(e) => setMaxTabSwitches(e.target.value)} placeholder="Unlimited" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Start time *</Label>
              <Input required type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>End time *</Label>
              <Input required type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} className="h-4 w-4 text-indigo-600" />
              Shuffle questions
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={shuffleChoices} onChange={(e) => setShuffleChoices(e.target.checked)} className="h-4 w-4 text-indigo-600" />
              Shuffle choices
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showResultsImmediately} onChange={(e) => setShowResultsImmediately(e.target.checked)} className="h-4 w-4 text-indigo-600" />
              Show results immediately
            </label>
          </div>

          <div className="rounded-lg border border-zinc-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Select questions ({selectedQuestionIds.size}/{bankQuestions.length})</Label>
              <Button type="button" variant="ghost" onClick={() => setSelectedQuestionIds(new Set(bankQuestions.map((q) => q.id)))}>Select all</Button>
            </div>
            {bankQuestions.length === 0 ? (
              <p className="text-sm text-zinc-400">No questions in this bank.</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {bankQuestions.map((q) => (
                  <div key={q.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={selectedQuestionIds.has(q.id)}
                      onChange={() => toggleQuestion(q.id)}
                      className="h-4 w-4 shrink-0 text-indigo-600"
                    />
                    <span className="flex-1 truncate text-sm text-zinc-800">{q.content}</span>
                    <span className="text-xs text-zinc-400">{q.questionType}</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-20"
                      placeholder="pts"
                      value={overrides[q.id] ?? ''}
                      onChange={(e) => setOverrides((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
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
