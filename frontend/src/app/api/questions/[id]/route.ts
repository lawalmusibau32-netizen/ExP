import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, created, fail, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

const INCLUDE = {
  questionBank: { select: { id: true, title: true } },
} as const;

function toDTO(q: any) {
  return {
    ...q,
    questionBankId: q.questionBank.id,
    questionBankTitle: q.questionBank.title,
    questionBank: undefined,
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id: BigInt(id) },
    include: INCLUDE,
  });
  if (!question) return notFound('Question not found');

  return ok(toDTO(question));
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return notFound('Question not found');

  let body: {
    questionBankId?: string | number;
    content?: string;
    questionType?: 'MCQ' | 'TRUE_FALSE' | 'FILL_BLANK' | 'SUBJECTIVE';
    points?: number;
    choices?: any;
    correctAnswer?: string | null;
    explanation?: string | null;
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const question = await prisma.question.update({
    where: { id: BigInt(id) },
    data: {
      questionBankId: body.questionBankId !== undefined ? BigInt(String(body.questionBankId)) : existing.questionBankId,
      content: body.content ?? existing.content,
      questionType: (body.questionType as any) ?? existing.questionType,
      points: body.points ?? existing.points,
      choices: body.choices !== undefined ? body.choices : existing.choices,
      correctAnswer: body.correctAnswer !== undefined ? body.correctAnswer : existing.correctAnswer,
      explanation: body.explanation !== undefined ? body.explanation : existing.explanation,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    },
    include: INCLUDE,
  });

  return ok(toDTO(question), 'Question updated');
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.question.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return notFound('Question not found');

  const inExam = await prisma.examQuestion.count({ where: { questionId: BigInt(id) } });
  if (inExam > 0) {
    return fail('Cannot delete question already used in an exam', 409);
  }

  await prisma.question.delete({ where: { id: BigInt(id) } });
  return ok(null, 'Question deleted');
}
