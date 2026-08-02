import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
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
    return fail('Attempt is not in progress');
  }

  const maxTabSwitches = attempt.exam.maxTabSwitches;
  const newCount = attempt.tabSwitchCount + 1;

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.examAttempt.update({
      where: { id: BigInt(attemptId) },
      data: { tabSwitchCount: newCount },
    });

    if (maxTabSwitches !== null && newCount >= maxTabSwitches) {
      const timedResult = await tx.examAttempt.update({
        where: { id: BigInt(attemptId) },
        data: { status: 'AUTO_SUBMITTED', submittedAt: new Date() },
      });
      await autoGrade(BigInt(attemptId), tx);
      await recalculateResult(BigInt(attemptId), tx);
      return { ...result, autoSubmitted: true, status: timedResult.status };
    }

    return { ...result, autoSubmitted: false };
  });

  return ok(
    {
      tabSwitchCount: updated.tabSwitchCount,
      maxTabSwitches,
      autoSubmitted: updated.autoSubmitted,
      status: updated.status,
    },
    updated.autoSubmitted ? 'Maximum tab switches reached. Attempt auto-submitted' : 'Tab switch recorded'
  );
}
