import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ok, unauthorized, notFound } from '@/lib/api';

type Params = { params: Promise<{ courseId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { id: BigInt(courseId) },
  });
  if (!course) return notFound('Course not found');

  const exams = await prisma.exam.findMany({
    where: { courseId: BigInt(courseId) },
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
    }))
  );
}
