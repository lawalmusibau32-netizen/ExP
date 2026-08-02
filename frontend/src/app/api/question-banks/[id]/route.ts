import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

const INCLUDE = {
  course: { select: { id: true, title: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { questions: true } },
} as const;

function toDTO(bank: any) {
  return {
    id: bank.id,
    title: bank.title,
    description: bank.description,
    courseId: bank.course.id,
    courseTitle: bank.course.title,
    createdById: bank.createdBy.id,
    createdByName: `${bank.createdBy.firstName} ${bank.createdBy.lastName}`,
    isActive: bank.isActive,
    questionCount: bank._count.questions,
    createdAt: bank.createdAt,
    updatedAt: bank.updatedAt,
  };
}

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const bank = await prisma.questionBank.findUnique({
    where: { id: BigInt(id) },
    include: INCLUDE,
  });
  if (!bank) return notFound('Question bank not found');

  return ok(toDTO(bank));
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.questionBank.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return notFound('Question bank not found');

  let body: { title?: string; description?: string; courseId?: string | number; isActive?: boolean };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const bank = await prisma.questionBank.update({
    where: { id: BigInt(id) },
    data: {
      title: body.title ?? existing.title,
      description: body.description !== undefined ? body.description : existing.description,
      courseId: body.courseId !== undefined ? BigInt(String(body.courseId)) : existing.courseId,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    },
    include: INCLUDE,
  });

  return ok(toDTO(bank), 'Question bank updated');
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.questionBank.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return notFound('Question bank not found');

  const questionCount = await prisma.question.count({ where: { questionBankId: BigInt(id) } });
  if (questionCount > 0) {
    return fail('Cannot delete question bank with questions', 409);
  }

  await prisma.questionBank.delete({ where: { id: BigInt(id) } });
  return ok(null, 'Question bank deleted');
}
