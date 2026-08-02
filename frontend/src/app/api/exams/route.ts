import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, created, fail, unauthorized, forbidden, notFound } from '@/lib/api';

const LIST_INCLUDE = {
  course: { select: { id: true, title: true } },
  questionBank: { select: { id: true, title: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

function toDTO(exam: any, includeQuestions = false) {
  const base = {
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
  };

  if (!includeQuestions) return base;

  const questions = (exam.examQuestions || []).map((eq: any) => ({
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

  return { ...base, questions };
}

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const exams = await prisma.exam.findMany({
    include: LIST_INCLUDE,
    orderBy: { startTime: 'desc' },
  });

  return ok(exams.map((e) => toDTO(e)));
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  let body: {
    title?: string;
    description?: string;
    courseId?: string | number;
    questionBankId?: string | number;
    durationMinutes?: number;
    passingScore?: number;
    maxAttempts?: number;
    maxTabSwitches?: number;
    shuffleQuestions?: boolean;
    shuffleChoices?: boolean;
    showResultsImmediately?: boolean;
    startTime?: string;
    endTime?: string;
    questionIds?: (string | number)[];
    pointsOverrides?: Record<string, number>;
  };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const {
    title,
    description,
    durationMinutes,
    passingScore,
    maxAttempts,
    maxTabSwitches,
    shuffleQuestions,
    shuffleChoices,
    showResultsImmediately,
    startTime,
    endTime,
    questionIds,
    pointsOverrides,
  } = body;

  if (!title || body.courseId === undefined || body.questionBankId === undefined || !durationMinutes || !startTime || !endTime) {
    return fail('title, courseId, questionBankId, durationMinutes, startTime and endTime are required');
  }

  const courseId = BigInt(String(body.courseId));
  const questionBankId = BigInt(String(body.questionBankId));

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return fail('Course not found', 404);
  const bank = await prisma.questionBank.findUnique({ where: { id: questionBankId } });
  if (!bank) return fail('Question bank not found', 404);

  const start = new Date(startTime);
  const end = new Date(endTime);
  if (end <= start) return fail('endTime must be after startTime');

  const ids = (questionIds || []).map((q) => BigInt(String(q)));
  const questions = await prisma.question.findMany({
    where: { id: { in: ids }, questionBankId },
  });
  if (ids.length > 0 && questions.length !== ids.length) {
    return fail('One or more questions not found in the selected bank');
  }

  const exam = await prisma.$transaction(async (tx) => {
    const created = await tx.exam.create({
      data: {
        title,
        description,
        courseId,
        questionBankId,
        createdById: BigInt(user.sub),
        durationMinutes,
        passingScore: passingScore ?? 50,
        maxAttempts: maxAttempts ?? 1,
        maxTabSwitches: maxTabSwitches ?? null,
        shuffleQuestions: shuffleQuestions ?? true,
        shuffleChoices: shuffleChoices ?? true,
        showResultsImmediately: showResultsImmediately ?? false,
        startTime: start,
        endTime: end,
      },
    });

    await tx.examQuestion.createMany({
      data: questions.map((q, index) => ({
        examId: created.id,
        questionId: q.id,
        questionOrder: index,
        pointsOverride: pointsOverrides?.[String(q.id)] ?? null,
      })),
    });

    return created;
  });

  const withRelations = await prisma.exam.findUnique({
    where: { id: exam.id },
    include: {
      ...LIST_INCLUDE,
      examQuestions: {
        include: { question: true },
        orderBy: { questionOrder: 'asc' },
      },
    },
  });

  return created(toDTO(withRelations, true), 'Exam created');
}
