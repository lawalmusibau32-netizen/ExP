import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

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

  const result = await prisma.result.upsert({
    where: { attemptId: BigInt(attemptId) },
    create: {
      attemptId: BigInt(attemptId),
      totalScore: 0,
      maxScore: 0,
      isReleased: true,
      releasedById: BigInt(user.sub),
      releasedAt: new Date(),
    },
    update: {
      isReleased: true,
      releasedById: BigInt(user.sub),
      releasedAt: new Date(),
    },
  });

  return ok(result, 'Result released');
}
