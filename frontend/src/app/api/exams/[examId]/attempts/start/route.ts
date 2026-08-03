import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';
import { ATTEMPT_INCLUDE, shuffle, buildAttemptDTO, autoGrade, recalculateResult } from '@/lib/attempts';

type Params = { params: Promise<{ examId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['STUDENT'])) return forbidden();

  const { examId } = await params;
  const exam = await prisma.exam.findUnique({
    where: { id: BigInt(examId) },
    include: {
      examQuestions: { include: { question: true }, orderBy: { questionOrder: 'asc' } },
      course: { select: { id: true, title: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!exam) return notFound('Exam not found');

  const now = new Date();
  if (exam.status !== 'ACTIVE') {
    return fail('Exam is not active');
  }
  if (now < exam.startTime) {
    return fail('Exam has not started yet');
  }
  if (now > exam.endTime) {
    return fail('Exam has ended');
  }

  const studentId = BigInt(user.sub);
  const maxAttempts = exam.maxAttempts ?? 1;

  const inProgress = await prisma.examAttempt.findFirst({
    where: { examId: BigInt(examId), studentId, status: 'IN_PROGRESS' },
    include: ATTEMPT_INCLUDE,
    orderBy: { startedAt: 'desc' },
  });

  if (inProgress) {
    const attemptDeadline = new Date(
      Math.min(
        new Date(inProgress.startedAt).getTime() + exam.durationMinutes * 60000,
        exam.endTime.getTime()
      )
    );

    if (now < attemptDeadline) {
      return ok(buildAttemptDTO(inProgress, { role: user.role, sub: user.sub }), 'Attempt resumed');
    }

    await prisma.$transaction(async (tx) => {
      await tx.examAttempt.update({
        where: { id: inProgress.id },
        data: { status: 'AUTO_SUBMITTED', submittedAt: now },
      });
      await autoGrade(inProgress.id, tx);
      await recalculateResult(inProgress.id, tx);
    });
  }

  const priorAttempts = await prisma.examAttempt.count({
    where: { examId: BigInt(examId), studentId },
  });
  if (priorAttempts >= maxAttempts) {
    return fail(`Maximum attempts (${maxAttempts}) reached for this exam`);
  }

  const questions = exam.examQuestions;
  if (questions.length === 0) {
    return fail('Exam has no questions');
  }

  const questionOrder = exam.shuffleQuestions
    ? shuffle(questions.map((eq) => Number(eq.questionId)))
    : questions.map((eq) => Number(eq.questionId));

  const choiceOrder: Record<string, number[]> = {};
  if (exam.shuffleChoices) {
    for (const eq of questions) {
      const choices = (eq.question.choices as any)?.options as string[] | undefined;
      if (choices?.length) {
        choiceOrder[String(eq.questionId)] = shuffle(choices.map((_, i) => i));
      }
    }
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null;
  const userAgent = request.headers.get('user-agent');

  const attempt = await prisma.examAttempt.create({
    data: {
      examId: BigInt(examId),
      studentId,
      attemptNumber: priorAttempts + 1,
      questionOrder,
      choiceOrder: Object.keys(choiceOrder).length ? (choiceOrder as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress,
      userAgent,
    },
    include: ATTEMPT_INCLUDE,
  });

  return ok(buildAttemptDTO(attempt, { role: user.role, sub: user.sub }), 'Attempt started');
}
