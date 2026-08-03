'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '@/lib/api-client';
import type { GeneratedQuestion, Question, QuestionBank, QuestionType } from '@/lib/types';
import { Badge, Button, Card, ConfirmButton, EmptyState, ErrorBanner, Input, Label, Modal, PageHeader, Select, Spinner, SuccessBanner, Textarea, formatDateTime } from '@/components/ui';

const TYPE_LABELS: Record<QuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  FILL_BLANK: 'Fill in the Blank',
  SUBJECTIVE: 'Subjective',
};

const ALL_TYPES: QuestionType[] = ['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SUBJECTIVE'];

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

  const [aiOpen, setAiOpen] = useState(false);
  const [aiBankId, setAiBankId] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState('5');
  const [aiTypes, setAiTypes] = useState<QuestionType[]>([...ALL_TYPES]);
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [aiExtra, setAiExtra] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<GeneratedQuestion[] | null>(null);
  const [aiEditIndex, setAiEditIndex] = useState<number | null>(null);
  const [aiSaving, setAiSaving] = useState(false);

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

  const openAi = () => {
    setAiOpen(true);
    setAiBankId(banks[0]?.id ?? '');
    setAiTopic('');
    setAiCount('5');
    setAiTypes([...ALL_TYPES]);
    setAiDifficulty('Medium');
    setAiExtra('');
    setAiError(null);
    setAiPreview(null);
    setAiEditIndex(null);
  };

  const toggleAiType = (t: QuestionType) => {
    setAiTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    setAiError(null);
    if (!aiTopic.trim()) {
      setAiError('Topic is required');
      return;
    }
    if (aiTypes.length === 0) {
      setAiError('Select at least one question type');
      return;
    }
    setAiBusy(true);
    setAiPreview(null);
    setAiEditIndex(null);
    try {
      const questions = await api.post<GeneratedQuestion[]>('/api/ai/generate-questions', {
        topic: aiTopic.trim(),
        questionBankId: aiBankId,
        count: Number(aiCount) || 5,
        types: aiTypes,
        difficulty: aiDifficulty,
        extraInstructions: aiExtra.trim() || undefined,
      });
      setAiPreview(questions);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setAiBusy(false);
    }
  };

  const updateAiItem = (index: number, patch: Partial<GeneratedQuestion>) => {
    setAiPreview((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeAiItem = (index: number) => {
    setAiPreview((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
    setAiEditIndex(null);
  };

  const saveAiBatch = async () => {
    if (!aiPreview || aiPreview.length === 0) return;
    setAiSaving(true);
    setAiError(null);
    try {
      await api.post('/api/questions/bulk', {
        questionBankId: aiBankId,
        questions: aiPreview,
      });
      setSuccess(`${aiPreview.length} question(s) generated and saved`);
      setAiOpen(false);
      setAiPreview(null);
      load();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setAiSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Questions"
        subtitle="Build your question bank content"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={openAi} className="btn-glow">Generate with AI</Button>
            <Button onClick={openCreate}>New Question</Button>
          </div>
        }
      />

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
      <Modal open={aiOpen} onClose={() => !aiBusy && setAiOpen(false)} title="Generate Questions with AI" wide>
        {!aiPreview ? (
          <form onSubmit={generate} className="space-y-4">
            <div>
              <Label>Topic *</Label>
              <Textarea
                required
                rows={3}
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="e.g. Newton's laws of motion, the Nigerian Civil War, photosynthesis, database normalization..."
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Question bank *</Label>
                <Select required value={aiBankId} onChange={(e) => setAiBankId(e.target.value)}>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Number of questions *</Label>
                <Input
                  required
                  type="number"
                  min={1}
                  max={20}
                  value={aiCount}
                  onChange={(e) => setAiCount(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Question types</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleAiType(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      aiTypes.includes(t)
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-zinc-300 text-zinc-500 hover:border-brand-400'
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </Select>
            </div>
            <div>
              <Label>Extra instructions (optional)</Label>
              <Textarea
                rows={2}
                value={aiExtra}
                onChange={(e) => setAiExtra(e.target.value)}
                placeholder="e.g. include calculations, use exam-style wording, no trick questions..."
              />
            </div>
            {aiError && <ErrorBanner message={aiError} />}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setAiOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={aiBusy} className="btn-glow">
                {aiBusy ? 'Generating...' : 'Generate'}
              </Button>
            </div>
            {aiBusy && (
              <div className="flex items-center justify-center gap-3 py-2 text-sm text-zinc-500">
                <Spinner /> Gemini is writing questions for your topic...
              </div>
            )}
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Review, edit or remove questions before saving. <span className="font-semibold text-zinc-700">{aiPreview.length}</span> generated.
              </p>
            </div>
            {aiError && <ErrorBanner message={aiError} />}
            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {aiPreview.map((q, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 p-4">
                  {aiEditIndex === i ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Question {i + 1}</Label>
                        <Button type="button" variant="ghost" onClick={() => setAiEditIndex(null)}>Done</Button>
                      </div>
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={q.questionType}
                          onChange={(e) => {
                            const t = e.target.value as QuestionType;
                            updateAiItem(i, { questionType: t, choices: t === 'MCQ' ? q.choices : null });
                          }}
                        >
                          {ALL_TYPES.map((t) => (
                            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>Content *</Label>
                        <Textarea rows={2} value={q.content} onChange={(e) => updateAiItem(i, { content: e.target.value })} />
                      </div>
                      {q.questionType === 'MCQ' && (
                        <div className="space-y-2">
                          <Label>Options *</Label>
                          {(q.choices?.options ?? []).map((opt, oi) => (
                            <Input
                              key={oi}
                              value={opt}
                              placeholder={`Option ${oi + 1}`}
                              onChange={(e) => {
                                const options = [...(q.choices?.options ?? [])];
                                options[oi] = e.target.value;
                                updateAiItem(i, { choices: { options } });
                              }}
                            />
                          ))}
                        </div>
                      )}
                      <div>
                        <Label>Correct answer *</Label>
                        <Input value={q.correctAnswer} onChange={(e) => updateAiItem(i, { correctAnswer: e.target.value })} />
                      </div>
                      <div>
                        <Label>Explanation</Label>
                        <Textarea rows={2} value={q.explanation ?? ''} onChange={(e) => updateAiItem(i, { explanation: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge label={TYPE_LABELS[q.questionType]} className="bg-sky-50 text-sky-700 border-sky-200" />
                            <Badge label={`${q.points} pt`} className="bg-zinc-100 text-zinc-600 border-zinc-200" />
                          </div>
                          <p className="mt-2 font-medium text-zinc-900">{i + 1}. {q.content}</p>
                          {q.questionType === 'MCQ' && (
                            <ul className="mt-1.5 space-y-0.5 text-sm text-zinc-600">
                              {(q.choices?.options ?? []).map((opt, oi) => (
                                <li key={oi} className="flex gap-1.5">
                                  <span className="font-semibold text-zinc-400">{String.fromCharCode(65 + oi)}.</span>
                                  <span className={opt === q.correctAnswer ? 'font-semibold text-emerald-700' : ''}>{opt}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-1.5 text-sm text-zinc-600">
                            <span className="font-semibold text-zinc-400">Answer:</span> <span className="font-medium text-emerald-700">{q.correctAnswer}</span>
                          </p>
                          {q.explanation && (
                            <p className="mt-1 text-sm text-zinc-500">
                              <span className="font-semibold text-zinc-400">Why:</span> {q.explanation}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button type="button" variant="secondary" onClick={() => setAiEditIndex(i)}>Edit</Button>
                          <Button type="button" variant="ghost" onClick={() => removeAiItem(i)}>Remove</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
              <Button type="button" variant="secondary" onClick={() => setAiPreview(null)}>Back</Button>
              <Button type="button" variant="secondary" onClick={() => setAiOpen(false)}>Cancel</Button>
              <Button type="button" disabled={aiSaving || aiPreview.length === 0} onClick={saveAiBatch} className="btn-glow">
                {aiSaving ? 'Saving...' : `Save All (${aiPreview.length})`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
