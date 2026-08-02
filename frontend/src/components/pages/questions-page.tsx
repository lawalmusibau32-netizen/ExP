'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import type { Question, QuestionBank, QuestionType } from '@/lib/types';
import { Badge, Button, Card, ConfirmButton, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, SuccessBanner, Textarea, formatDateTime } from '@/components/ui';

const TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  FILL_BLANK: 'Fill in the Blank',
  SUBJECTIVE: 'Subjective',
};

export function QuestionsPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [bankFilter, setBankFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [content, setContent] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('MCQ');
  const [points, setPoints] = useState('1');
  const [questionBankId, setQuestionBankId] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctIndex, setCorrectIndex] = useState('0');
  const [tfAnswer, setTfAnswer] = useState('true');
  const [fillAnswer, setFillAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [questions, allBanks] = await Promise.all([
        api.get<Question[]>('/api/questions'),
        api.get<QuestionBank[]>('/api/question-banks'),
      ]);
      setItems(questions);
      setBanks(allBanks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => (bankFilter === 'ALL' ? items : items.filter((q) => q.questionBankId === bankFilter)),
    [items, bankFilter]
  );

  const resetForm = () => {
    setEditing(null);
    setContent('');
    setQuestionType('MCQ');
    setPoints('1');
    setQuestionBankId(banks[0]?.id ?? '');
    setOptions(['', '']);
    setCorrectIndex('0');
    setTfAnswer('true');
    setFillAnswer('');
    setExplanation('');
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    setContent(q.content);
    setQuestionType(q.questionType);
    setPoints(String(q.points));
    setQuestionBankId(q.questionBankId);
    const opts = q.choices?.options ?? [];
    setOptions(opts.length ? opts : ['', '']);
    const correct = q.correctAnswer ?? '';
    const idx = q.questionType === 'MCQ' ? String(Math.max(opts.indexOf(correct), 0)) : '0';
    setCorrectIndex(idx);
    setTfAnswer(correct === 'false' ? 'false' : 'true');
    setFillAnswer(q.questionType === 'FILL_BLANK' ? correct : '');
    setExplanation(q.explanation ?? '');
    setModalOpen(true);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const trimmed = options.map((o) => o.trim()).filter(Boolean);
      let choices = null;
      let correctAnswer: string | null = null;
      if (questionType === 'MCQ') {
        if (trimmed.length < 2) {
          setError('MCQ questions need at least 2 options');
          setSaving(false);
          return;
        }
        choices = { options: trimmed };
        correctAnswer = trimmed[Number(correctIndex)] ?? trimmed[0];
      } else if (questionType === 'TRUE_FALSE') {
        correctAnswer = tfAnswer;
      } else if (questionType === 'FILL_BLANK') {
        correctAnswer = fillAnswer.trim() || null;
      }

      const payload = { questionBankId, content, questionType, points: Number(points) || 1, choices, correctAnswer, explanation };
      if (editing) {
        await api.put(`/api/questions/${editing.id}`, payload);
        setSuccess('Question updated');
      } else {
        await api.post('/api/questions', payload);
        setSuccess('Question created');
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
      await api.del(`/api/questions/${id}`);
      setSuccess('Question deleted');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <PageHeader title="Questions" subtitle="Build your question bank content" actions={<Button onClick={openCreate}>New Question</Button>} />

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
            <div className="mb-4 w-full sm:w-72">
              <Select value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
                <option value="ALL">All banks</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </Select>
            </div>
            {filtered.length === 0 ? (
              <EmptyState label="No questions found." />
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-400">
                    <th className="pb-3 pr-4 font-medium">Content</th>
                    <th className="pb-3 pr-4 font-medium">Type</th>
                    <th className="pb-3 pr-4 font-medium">Bank</th>
                    <th className="pb-3 pr-4 font-medium">Points</th>
                    <th className="pb-3 pr-4 font-medium">Created</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => (
                    <tr key={q.id} className="border-b border-zinc-100 last:border-0 align-top">
                      <td className="max-w-md py-3 pr-4 text-zinc-900">{q.content}</td>
                      <td className="py-3 pr-4">
                        <Badge label={TYPE_LABELS[q.questionType]} className="bg-sky-50 text-sky-700 border-sky-200" />
                      </td>
                      <td className="py-3 pr-4 text-zinc-500">{q.questionBankTitle}</td>
                      <td className="py-3 pr-4 text-zinc-500">{q.points}</td>
                      <td className="py-3 pr-4 text-zinc-500">{formatDateTime(q.createdAt)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" onClick={() => openEdit(q)}>Edit</Button>
                          <ConfirmButton onConfirm={() => remove(q.id)}>Delete</ConfirmButton>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Question' : 'New Question'} wide>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label>Question bank *</Label>
              <Select required value={questionBankId} onChange={(e) => setQuestionBankId(e.target.value)}>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Points *</Label>
              <Input required type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Question type *</Label>
            <Select
              value={questionType}
              onChange={(e) => {
                setQuestionType(e.target.value as QuestionType);
                setCorrectIndex('0');
              }}
            >
              <option value="MCQ">Multiple Choice</option>
              <option value="TRUE_FALSE">True / False</option>
              <option value="FILL_BLANK">Fill in the Blank</option>
              <option value="SUBJECTIVE">Subjective</option>
            </Select>
          </div>
          <div>
            <Label>Question content *</Label>
            <Textarea required rows={3} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type the question..." />
          </div>

          {questionType === 'MCQ' && (
            <div className="space-y-2 rounded-lg border border-zinc-200 p-4">
              <Label>Options *</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={correctIndex === String(i)}
                    onChange={() => setCorrectIndex(String(i))}
                    title="Mark as correct"
                    className="h-4 w-4 text-indigo-600"
                  />
                  <Input
                    value={opt}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={options.length <= 2}
                    onClick={() => {
                      if (options.length <= 2) return;
                      const next = options.filter((_, j) => j !== i);
                      if (Number(correctIndex) === i) setCorrectIndex('0');
                      setOptions(next);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOptions([...options, ''])}
                className="mt-2"
              >
                + Add option
              </Button>
            </div>
          )}

          {questionType === 'TRUE_FALSE' && (
            <div>
              <Label>Correct answer *</Label>
              <Select value={tfAnswer} onChange={(e) => setTfAnswer(e.target.value)}>
                <option value="true">True</option>
                <option value="false">False</option>
              </Select>
            </div>
          )}

          {questionType === 'FILL_BLANK' && (
            <div>
              <Label>Correct answer *</Label>
              <Input required value={fillAnswer} onChange={(e) => setFillAnswer(e.target.value)} placeholder="Expected answer" />
            </div>
          )}

          <div>
            <Label>Explanation (shown after release)</Label>
            <Textarea rows={2} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
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
