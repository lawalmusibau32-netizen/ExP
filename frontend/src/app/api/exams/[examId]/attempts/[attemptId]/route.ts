import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ok, unauthorized, forbidden, notFound } from '@/lib/api';
import { ATTEMPT_INCLUDE, buildAttemptDTO } from '@/lib/attempts';

type Params = { params: Promise<{ examId: string; attemptId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { examId, attemptId } = await params;
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: BigInt(attemptId) },
    include: ATTEMPT_INCLUDE,
  });
  if (!attempt || String(attempt.examId) !== examId) {
    return notFound('Attempt not found');
  }

  if (user.role === 'STUDENT' && String(attempt.studentId) !== user.sub) {
    return forbidden();
  }

  return ok(buildAttemptDTO(attempt, { role: user.role, sub: user.sub }));
}
