import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, unauthorized, forbidden } from '@/lib/api';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['LECTURER', 'ADMIN'])) return forbidden();

  const exams = await prisma.exam.findMany({
    where: { createdById: BigInt(user.sub) },
    include: {
      course: { select: { id: true, title: true } },
      questionBank: { select: { id: true, title: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { startTime: 'desc' },
  });

  return ok(
    exams.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      courseId: e.course.id,
      courseTitle: e.course.title,
      questionBankId: e.questionBank.id,
      questionBankTitle: e.questionBank.title,
      createdById: e.createdBy.id,
      createdByName: `${e.createdBy.firstName} ${e.createdBy.lastName}`,
      durationMinutes: e.durationMinutes,
      passingScore: e.passingScore,
      maxAttempts: e.maxAttempts,
      maxTabSwitches: e.maxTabSwitches,
      shuffleQuestions: e.shuffleQuestions,
      shuffleChoices: e.shuffleChoices,
      showResultsImmediately: e.showResultsImmediately,
      startTime: e.startTime,
      endTime: e.endTime,
      status: e.status,
      createdAt: e.createdAt,
    }))
  );
}
