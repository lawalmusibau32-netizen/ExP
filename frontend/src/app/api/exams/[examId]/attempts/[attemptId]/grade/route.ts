import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';
import { recalculateResult, ATTEMPT_INCLUDE, buildAttemptDTO } from '@/lib/attempts';

type Params = { params: Promise<{ examId: string; attemptId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['LECTURER', 'ADMIN'])) return forbidden();

  const { examId, attemptId } = await params;
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: BigInt(attemptId) },
  });
  if (!attempt || String(attempt.examId) !== examId) {
    return notFound('Attempt not found');
  }
  if (attempt.status === 'IN_PROGRESS') {
    return fail('Attempt has not been submitted yet');
  }

  let body: { questionId?: string | number; score?: number };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  if (body.questionId === undefined || body.score === undefined) {
    return fail('questionId and score are required');
  }

  const questionId = BigInt(String(body.questionId));
  const answer = await prisma.studentAnswer.findUnique({
    where: {
      attemptId_questionId: { attemptId: BigInt(attemptId), questionId },
    },
    include: { question: true },
  });
  if (!answer) return notFound('Answer not found');
  if (answer.question.questionType !== 'SUBJECTIVE') {
    return fail('Only subjective questions can be graded manually');
  }

  const maxScore = answer.question.points;
  const score = Number(body.score);
  if (score < 0 || score > maxScore) {
    return fail(`Score must be between 0 and ${maxScore}`);
  }

  const graded = await prisma.$transaction(async (tx) => {
    const result = await tx.studentAnswer.update({
      where: { id: answer.id },
      data: {
        scoreObtained: score,
        isCorrect: score >= maxScore,
        gradedById: BigInt(user.sub),
        gradedAt: new Date(),
      },
    });

    await tx.examAttempt.update({
      where: { id: BigInt(attemptId) },
      data: { status: 'GRADED' },
    });

    await recalculateResult(BigInt(attemptId), tx);
    return result;
  });

  const full = await prisma.examAttempt.findUnique({
    where: { id: BigInt(attemptId) },
    include: ATTEMPT_INCLUDE,
  });

  return ok(buildAttemptDTO(full!, { role: user.role, sub: user.sub }), 'Question graded');
}
