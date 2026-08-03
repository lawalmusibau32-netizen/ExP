import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

const ALLOWED_TYPES = ['MCQ', 'TRUE_FALSE', 'FILL_BLANK', 'SUBJECTIVE'];

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  let body: {
    questionBankId?: string | number;
    newBank?: { title?: string; courseId?: string | number };
    questions?: Array<{
      content?: string;
      questionType?: string;
      points?: number;
      choices?: { options?: string[] } | null;
      correctAnswer?: string;
      explanation?: string;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const { questionBankId, questions, newBank } = body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return fail('A non-empty questions array is required');
  }
  if (questions.length > 50) return fail('Too many questions in one batch (max 50)');

  if (questionBankId === undefined && (!newBank?.title || newBank.courseId === undefined)) {
    return fail('Provide an existing questionBankId or newBank { title, courseId }');
  }
  if (questionBankId !== undefined && newBank !== undefined) {
    return fail('Provide either questionBankId or newBank, not both');
  }

  const userId = BigInt(user.sub);

  if (questionBankId !== undefined) {
    const bank = await prisma.questionBank.findUnique({ where: { id: BigInt(String(questionBankId)) } });
    if (!bank) return notFound('Question bank not found');
  } else {
    const course = await prisma.course.findUnique({ where: { id: BigInt(String(newBank!.courseId!)) } });
    if (!course) return notFound('Course not found');
  }

  const rows = questions.map((q) => ({
    questionBankId: BigInt(String(questionBankId ?? 0)),
    content: String(q.content ?? '').trim(),
    questionType: ALLOWED_TYPES.includes(q.questionType ?? '') ? (q.questionType as any) : 'MCQ',
    points: Math.max(1, Math.min(20, Number(q.points) || 1)),
    choices: q.choices && Array.isArray(q.choices.options) && q.choices.options.length >= 2
      ? { options: q.choices.options.map((o) => String(o).trim()).filter(Boolean) }
      : undefined,
    correctAnswer: q.correctAnswer ? String(q.correctAnswer).trim() : null,
    explanation: q.explanation ? String(q.explanation).trim() : null,
  }));

  const valid = rows.filter((r) => r.content);
  if (valid.length === 0) return fail('No valid questions in the batch');

  let bankId: bigint;
  let bankCreated = false;

  if (questionBankId !== undefined) {
    bankId = BigInt(String(questionBankId));
  } else {
    const createdBank = await prisma.questionBank.create({
      data: {
        title: String(newBank!.title).trim(),
        courseId: BigInt(String(newBank!.courseId!)),
        createdById: userId,
      },
    });
    bankId = createdBank.id;
    bankCreated = true;
    valid.forEach((r) => (r.questionBankId = bankId));
  }

  const operations: any[] = [];
  if (bankCreated) {
    operations.push(
      prisma.auditLog.create({
        data: {
          userId,
          action: 'QUESTION_BANK_CREATED',
          resourceType: 'QUESTION_BANK',
          resourceId: bankId,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
          userAgent: request.headers.get('user-agent'),
        },
      })
    );
  }
  operations.push(prisma.question.createMany({ data: valid }));
  operations.push(
    prisma.auditLog.create({
      data: {
        userId,
        action: 'QUESTIONS_BULK_CREATED',
        resourceType: 'QUESTION_BANK',
        resourceId: bankId,
        details: { count: valid.length, newBank: bankCreated },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
        userAgent: request.headers.get('user-agent'),
      },
    })
  );

  await prisma.$transaction(operations);

  return ok({ count: valid.length, questionBankId: String(bankId), newBank: bankCreated }, `${valid.length} question(s) created`);
}
