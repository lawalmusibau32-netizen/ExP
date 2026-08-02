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
  const sortBy = url.searchParams.get('sortBy') || 'title';
  const direction = url.searchParams.get('direction') || 'asc';

  const orderBy = { [sortBy]: direction } as const;
  const [total, content] = await Promise.all([
    prisma.questionBank.count(),
    prisma.questionBank.findMany({
      skip: page * size,
      take: size,
      orderBy,
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { questions: true } },
      },
    }),
  ]);

  return ok({
    content: content.map((b) => ({
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
    })),
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    last: page >= Math.ceil(total / size) - 1,
  });
}
