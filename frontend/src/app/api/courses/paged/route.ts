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
    prisma.course.count(),
    prisma.course.findMany({
      skip: page * size,
      take: size,
      orderBy,
      include: { department: { select: { id: true, name: true } } },
    }),
  ]);

  return ok({
    content: content.map((c) => ({
      id: c.id,
      departmentId: c.department.id,
      departmentName: c.department.name,
      title: c.title,
      code: c.code,
      description: c.description,
      credits: c.credits,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    last: page >= Math.ceil(total / size) - 1,
  });
}
