import { prisma } from '@/lib/prisma';

export const ATTEMPT_INCLUDE = {
  exam: {
    include: {
      course: { select: { id: true, title: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      examQuestions: {
        include: { question: true },
        orderBy: { questionOrder: 'asc' },
      },
    },
  },
  student: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  studentAnswers: {
    include: {
      question: true,
      gradedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  result: true,
} as const;

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function getExamQuestionsForAttempt(examId: bigint) {
  return prisma.examQuestion.findMany({
    where: { examId },
    include: { question: true },
    orderBy: { questionOrder: 'asc' },
  });
}

export function isAutoGradable(type: string): boolean {
  return type === 'MCQ' || type === 'TRUE_FALSE' || type === 'FILL_BLANK';
}

export function gradeAnswer(question: any, answerText?: string | null, selectedChoices?: string | null): { correct: boolean; score: number } {
  const correctAnswer = question.correctAnswer;

  switch (question.questionType) {
    case 'MCQ': {
      const correct = correctAnswer && selectedChoices === correctAnswer;
      return { correct: !!correct, score: correct ? question.points : 0 };
    }
    case 'TRUE_FALSE': {
      const normalized = answerText?.trim().toLowerCase();
      const target = correctAnswer?.trim().toLowerCase();
      const correct = normalized === target;
      return { correct, score: correct ? question.points : 0 };
    }
    case 'FILL_BLANK': {
      const normalized = answerText?.trim().toLowerCase().replace(/\s+/g, ' ');
      const target = correctAnswer?.trim().toLowerCase().replace(/\s+/g, ' ');
      const correct = !!target && normalized === target;
      return { correct, score: correct ? question.points : 0 };
    }
    default:
      return { correct: false, score: 0 };
  }
}

export async function recalculateResult(attemptId: bigint, tx: any) {
  const attempt = await tx.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      studentAnswers: true,
      exam: { include: { examQuestions: { include: { question: true } } } },
    },
  });
  if (!attempt) return null;

  const maxScore = attempt.exam.examQuestions.reduce(
    (sum: number, eq: any) => sum + (eq.pointsOverride ?? eq.question.points),
    0
  );
  const totalScore = attempt.studentAnswers.reduce(
    (sum: number, a: any) => sum + Number(a.scoreObtained || 0),
    0
  );
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 10000) / 100 : 0;
  const passed = percentage >= attempt.exam.passingScore;

  const result = await tx.result.upsert({
    where: { attemptId },
    create: {
      attemptId,
      totalScore,
      maxScore,
      percentage,
      passed,
    },
    update: {
      totalScore,
      maxScore,
      percentage,
      passed,
    },
  });

  return result;
}

export async function autoGrade(attemptId: bigint, tx: any) {
  const attempt = await tx.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      studentAnswers: { include: { question: true } },
    },
  });
  if (!attempt) return;

  for (const answer of attempt.studentAnswers) {
    if (!isAutoGradable(answer.question.questionType)) continue;
    const { correct, score } = gradeAnswer(
      answer.question,
      answer.answerText,
      answer.selectedChoices
    );
    await tx.studentAnswer.update({
      where: { id: answer.id },
      data: {
        isCorrect: correct,
        scoreObtained: score,
      },
    });
  }
}

export function buildAttemptDTO(attempt: any, viewer: { role: string; sub: string }) {
  const examQuestions = attempt.exam?.examQuestions?.length
    ? attempt.exam.examQuestions
    : [];

  const questionOrder: number[] = Array.isArray(attempt.questionOrder)
    ? attempt.questionOrder
    : examQuestions.map((eq: any) => Number(eq.questionId));

  const orderedQuestions = questionOrder
    .map((qid) => examQuestions.find((eq: any) => Number(eq.questionId) === qid))
    .filter(Boolean);

  const isLecturer = viewer.role === 'LECTURER' || viewer.role === 'ADMIN';
  const isOwner = Number(attempt.studentId) === Number(viewer.sub);
  const resultReleased = !!attempt.result?.isReleased;

  const canSeeAnswers = isLecturer || (isOwner && resultReleased && attempt.exam.showResultsImmediately) || (isOwner && resultReleased);

  const questions = orderedQuestions.map((eq: any) => {
    const q = eq.question;
    const answer = attempt.studentAnswers?.find((a: any) => Number(a.questionId) === Number(q.id));

    const questionDTO: any = {
      id: eq.id,
      examId: attempt.examId,
      questionId: q.id,
      questionContent: q.content,
      questionType: q.questionType,
      points: eq.pointsOverride ?? q.points,
      questionOrder: eq.questionOrder,
      choices: q.choices,
    };

    if (canSeeAnswers) {
      questionDTO.correctAnswer = q.correctAnswer;
      questionDTO.explanation = q.explanation;
    }

    return questionDTO;
  });

  const answers = (attempt.studentAnswers || []).map((a: any) => ({
    id: a.id,
    attemptId: a.attemptId,
    questionId: a.questionId,
    questionContent: a.question.content,
    questionType: a.question.questionType,
    answerText: a.answerText,
    selectedChoices: a.selectedChoices,
    isCorrect: a.isCorrect,
    scoreObtained: a.scoreObtained,
    gradedByName: a.gradedBy ? `${a.gradedBy.firstName} ${a.gradedBy.lastName}` : null,
    gradedAt: a.gradedAt,
    correctAnswer: canSeeAnswers ? a.question.correctAnswer : null,
  }));

  return {
    id: attempt.id,
    examId: attempt.examId,
    examTitle: attempt.exam.title,
    courseTitle: attempt.exam.course.title,
    studentId: attempt.studentId,
    studentName: `${attempt.student.firstName} ${attempt.student.lastName}`,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    tabSwitchCount: attempt.tabSwitchCount,
    maxTabSwitches: attempt.exam.maxTabSwitches,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    durationMinutes: attempt.exam.durationMinutes,
    endTime: attempt.startedAt
      ? new Date(new Date(attempt.startedAt).getTime() + attempt.exam.durationMinutes * 60000)
      : null,
    resultsAvailable: resultReleased,
    questions,
    answers,
    result: attempt.result,
  };
}
