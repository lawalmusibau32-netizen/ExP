import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id: BigInt(id) },
    include: {
      course: { select: { id: true, title: true } },
      questionBank: { select: { id: true, title: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      examQuestions: {
        include: { question: true },
        orderBy: { questionOrder: 'asc' },
      },
    },
  });
  if (!exam) return notFound('Exam not found');

  const questions = exam.examQuestions.map((eq: any) => ({
    id: eq.id,
    examId: eq.examId,
    questionId: eq.question.id,
    questionContent: eq.question.content,
    questionType: eq.question.questionType,
    points: eq.pointsOverride ?? eq.question.points,
    questionOrder: eq.questionOrder,
    choices: eq.question.choices,
    correctAnswer: eq.question.correctAnswer,
    explanation: eq.question.explanation,
  }));

  return ok({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    courseId: exam.course.id,
    courseTitle: exam.course.title,
    questionBankId: exam.questionBank.id,
    questionBankTitle: exam.questionBank.title,
    createdById: exam.createdBy.id,
    createdByName: `${exam.createdBy.firstName} ${exam.createdBy.lastName}`,
    durationMinutes: exam.durationMinutes,
    passingScore: exam.passingScore,
    maxAttempts: exam.maxAttempts,
    maxTabSwitches: exam.maxTabSwitches,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleChoices: exam.shuffleChoices,
    showResultsImmediately: exam.showResultsImmediately,
    startTime: exam.startTime,
    endTime: exam.endTime,
    status: exam.status,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    questions,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { id } = await params;
  const exam = await prisma.exam.findUnique({ where: { id: BigInt(id) } });
  if (!exam) return notFound('Exam not found');

  let body: {
    title?: string;
    description?: string;
    durationMinutes?: number;
    passingScore?: number;
    maxAttempts?: number;
    maxTabSwitches?: number | null;
    shuffleQuestions?: boolean;
    shuffleChoices?: boolean;
    showResultsImmediately?: boolean;
    startTime?: string;
    endTime?: string;
  };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.durationMinutes !== undefined) data.durationMinutes = Math.max(1, body.durationMinutes);
  if (body.passingScore !== undefined) data.passingScore = Math.max(0, Math.min(100, body.passingScore));
  if (body.maxAttempts !== undefined) data.maxAttempts = Math.max(1, body.maxAttempts);
  if (body.maxTabSwitches !== undefined) data.maxTabSwitches = body.maxTabSwitches;
  if (body.shuffleQuestions !== undefined) data.shuffleQuestions = body.shuffleQuestions;
  if (body.shuffleChoices !== undefined) data.shuffleChoices = body.shuffleChoices;
  if (body.showResultsImmediately !== undefined) data.showResultsImmediately = body.showResultsImmediately;
  if (body.startTime !== undefined) data.startTime = new Date(body.startTime);
  if (body.endTime !== undefined) data.endTime = new Date(body.endTime);

  if (Object.keys(data).length === 0) return fail('No fields to update');

  const updated = await prisma.exam.update({ where: { id: BigInt(id) }, data });
  return ok({ id: updated.id, ...data }, 'Exam updated');
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { id } = await params;
  const exam = await prisma.exam.findUnique({ where: { id: BigInt(id) } });
  if (!exam) return notFound('Exam not found');

  const attempts = await prisma.examAttempt.count({ where: { examId: BigInt(id) } });
  if (attempts > 0) {
    return fail('Cannot delete exam with attempts', 409);
  }

  await prisma.$transaction([
    prisma.examQuestion.deleteMany({ where: { examId: BigInt(id) } }),
    prisma.exam.delete({ where: { id: BigInt(id) } }),
  ]);

  return ok(null, 'Exam deleted');
}
