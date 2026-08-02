import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, unauthorized, forbidden } from '@/lib/api';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['STUDENT'])) return forbidden();

  const attempts = await prisma.examAttempt.findMany({
    where: { studentId: BigInt(user.sub) },
    include: {
      exam: {
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          passingScore: true,
          showResultsImmediately: true,
          course: { select: { id: true, title: true } },
        },
      },
      result: true,
    },
    orderBy: { startedAt: 'desc' },
  });

  return ok(
    attempts.map((a) => ({
      id: a.id,
      examId: a.examId,
      examTitle: a.exam.title,
      courseTitle: a.exam.course.title,
      attemptNumber: a.attemptNumber,
      status: a.status,
      tabSwitchCount: a.tabSwitchCount,
      maxTabSwitches: null,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      resultsAvailable: !!a.result?.isReleased,
      result: a.result,
      showResultsImmediately: a.exam.showResultsImmediately,
    }))
  );
}
