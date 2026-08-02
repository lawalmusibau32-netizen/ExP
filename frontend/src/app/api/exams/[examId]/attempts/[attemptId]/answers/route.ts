import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ examId: string; attemptId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['STUDENT'])) return forbidden();

  const { examId, attemptId } = await params;
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: BigInt(attemptId) },
    include: { exam: true },
  });
  if (!attempt || String(attempt.examId) !== examId) {
    return notFound('Attempt not found');
  }
  if (String(attempt.studentId) !== user.sub) {
    return forbidden();
  }
  if (attempt.status !== 'IN_PROGRESS') {
    return fail('Attempt is not in progress');
  }

  const deadline = new Date(new Date(attempt.startedAt).getTime() + attempt.exam.durationMinutes * 60000);
  if (new Date() > deadline) {
    return fail('Attempt time has expired');
  }

  let body: { questionId?: string | number; answerText?: string; selectedChoices?: string };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  if (body.questionId === undefined) {
    return fail('questionId is required');
  }

  const questionId = BigInt(String(body.questionId));
  const inExam = await prisma.examQuestion.findUnique({
    where: {
      examId_questionId: { examId: BigInt(examId), questionId },
    },
  });
  if (!inExam) return fail('Question not part of this exam', 404);

  const answer = await prisma.studentAnswer.upsert({
    where: {
      attemptId_questionId: { attemptId: BigInt(attemptId), questionId },
    },
    create: {
      attemptId: BigInt(attemptId),
      questionId,
      answerText: body.answerText ?? null,
      selectedChoices: body.selectedChoices ?? null,
    },
    update: {
      answerText: body.answerText ?? null,
      selectedChoices: body.selectedChoices ?? null,
    },
  });

  return ok(answer, 'Answer saved');
}
