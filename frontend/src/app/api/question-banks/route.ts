import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, created, fail, unauthorized, forbidden, notFound } from '@/lib/api';

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

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const banks = await prisma.questionBank.findMany({
    include: INCLUDE,
    orderBy: { title: 'asc' },
  });

  return ok(banks.map(toDTO));
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  let body: { title?: string; description?: string; courseId?: string | number };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const { title, description } = body;
  if (!title || body.courseId === undefined) {
    return fail('Title and courseId are required');
  }

  const courseId = BigInt(String(body.courseId));
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return fail('Course not found', 404);

  const bank = await prisma.questionBank.create({
    data: {
      title,
      description,
      courseId,
      createdById: BigInt(user.sub),
    },
    include: INCLUDE,
  });

  return created(toDTO(bank), 'Question bank created');
}
