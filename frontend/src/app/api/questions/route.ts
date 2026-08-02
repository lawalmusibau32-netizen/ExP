import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, created, fail, unauthorized, forbidden, notFound } from '@/lib/api';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const questions = await prisma.question.findMany({
    include: { questionBank: { select: { id: true, title: true } } },
    orderBy: { id: 'asc' },
  });

  return ok(
    questions.map((q) => ({
      ...q,
      questionBankId: q.questionBank.id,
      questionBankTitle: q.questionBank.title,
      questionBank: undefined,
    }))
  );
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  let body: {
    questionBankId?: string | number;
    content?: string;
    questionType?: 'MCQ' | 'TRUE_FALSE' | 'FILL_BLANK' | 'SUBJECTIVE';
    points?: number;
    choices?: any;
    correctAnswer?: string;
    explanation?: string;
  };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const { content, questionType, points, choices, correctAnswer, explanation } = body;
  if (!content || !questionType || body.questionBankId === undefined) {
    return fail('questionBankId, content and questionType are required');
  }
  if (!['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SUBJECTIVE'].includes(questionType)) {
    return fail('Invalid question type');
  }

  const questionBankId = BigInt(String(body.questionBankId));
  const bank = await prisma.questionBank.findUnique({ where: { id: questionBankId } });
  if (!bank) return fail('Question bank not found', 404);

  const question = await prisma.question.create({
    data: {
      questionBankId,
      content,
      questionType,
      points: points ?? 1,
      choices: choices ?? undefined,
      correctAnswer,
      explanation,
    },
    include: { questionBank: { select: { id: true, title: true } } },
  });

  return created(
    {
      ...question,
      questionBankId: question.questionBank.id,
      questionBankTitle: question.questionBank.title,
      questionBank: undefined,
    },
    'Question created'
  );
}
