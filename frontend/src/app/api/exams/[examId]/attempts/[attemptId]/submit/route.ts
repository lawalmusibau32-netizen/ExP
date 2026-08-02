import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';
import { autoGrade, recalculateResult, ATTEMPT_INCLUDE, buildAttemptDTO } from '@/lib/attempts';

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
    return fail('Attempt already submitted');
  }

  const submittedAt = new Date();
  const deadline = new Date(new Date(attempt.startedAt).getTime() + attempt.exam.durationMinutes * 60000);
  const timedOut = submittedAt > deadline;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.examAttempt.update({
      where: { id: BigInt(attemptId) },
      data: {
        status: timedOut ? 'AUTO_SUBMITTED' : 'SUBMITTED',
        submittedAt,
      },
    });

    await autoGrade(BigInt(attemptId), tx);
    await recalculateResult(BigInt(attemptId), tx);

    return result;
  });

  const full = await prisma.examAttempt.findUnique({
    where: { id: updated.id },
    include: ATTEMPT_INCLUDE,
  });

  return ok(buildAttemptDTO(full!, { role: user.role, sub: user.sub }), 'Attempt submitted');
}
