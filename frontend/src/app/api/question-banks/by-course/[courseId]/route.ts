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

  const banks = await prisma.questionBank.findMany({
    where: { courseId: BigInt(courseId) },
    include: {
      course: { select: { id: true, title: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { title: 'asc' },
  });

  return ok(
    banks.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      courseId: b.course.id,
      courseTitle: b.course.title,
      createdById: b.createdBy.id,
      createdByName: `${b.createdBy.firstName} ${b.createdBy.lastName}`,
      isActive: b.isActive,
      questionCount: b._count.questions,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }))
  );
}
