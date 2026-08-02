import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ok, unauthorized } from '@/lib/api';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '0');
  const size = parseInt(url.searchParams.get('size') || '20');
  const sortBy = url.searchParams.get('sortBy') || 'startTime';
  const direction = url.searchParams.get('direction') || 'desc';

  const orderBy = { [sortBy]: direction } as const;
  const [total, content] = await Promise.all([
    prisma.exam.count(),
    prisma.exam.findMany({
      skip: page * size,
      take: size,
      orderBy,
      include: {
        course: { select: { id: true, title: true } },
        questionBank: { select: { id: true, title: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  return ok({
    content: content.map((e) => ({
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
    })),
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    last: page >= Math.ceil(total / size) - 1,
  });
}
