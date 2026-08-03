import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

const ALLOWED_TYPES = ['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SUBJECTIVE'];

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  let body: {
    questionBankId?: string | number;
    questions?: Array<{
      content?: string;
      questionType?: string;
      points?: number;
      choices?: { options?: string[] } | null;
      correctAnswer?: string;
      explanation?: string;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const { questionBankId, questions } = body;
  if (questionBankId === undefined || !Array.isArray(questions) || questions.length === 0) {
    return fail('questionBankId and a non-empty questions array are required');
  }
  if (questions.length > 50) return fail('Too many questions in one batch (max 50)');

  const bank = await prisma.questionBank.findUnique({ where: { id: BigInt(String(questionBankId)) } });
  if (!bank) return notFound('Question bank not found');

  const rows = questions.map((q) => ({
    questionBankId: bank.id,
    content: String(q.content ?? '').trim(),
    questionType: ALLOWED_TYPES.includes(q.questionType ?? '') ? (q.questionType as any) : 'MCQ',
    points: Math.max(1, Math.min(20, Number(q.points) || 1)),
    choices: q.choices && Array.isArray(q.choices.options) && q.choices.options.length >= 2
      ? { options: q.choices.options.map((o) => String(o).trim()).filter(Boolean) }
      : undefined,
    correctAnswer: q.correctAnswer ? String(q.correctAnswer).trim() : null,
    explanation: q.explanation ? String(q.explanation).trim() : null,
  }));

  const valid = rows.filter((r) => r.content);
  if (valid.length === 0) return fail('No valid questions in the batch');

  await prisma.$transaction([
    prisma.question.createMany({ data: valid }),
    prisma.auditLog.create({
      data: {
        userId: BigInt(user.sub),
        action: 'QUESTIONS_BULK_CREATED',
        resourceType: 'QUESTION_BANK',
        resourceId: bank.id,
        details: { count: valid.length },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent'),
      },
    }),
  ]);

  return ok({ count: valid.length }, `${valid.length} question(s) created`);
}
