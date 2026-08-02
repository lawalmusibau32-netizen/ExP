import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '0');
  const size = parseInt(url.searchParams.get('size') || '20');
  const sortBy = url.searchParams.get('sortBy') || 'name';
  const direction = url.searchParams.get('direction') || 'asc';

  const orderBy = { [sortBy]: direction } as const;
  const [total, content] = await Promise.all([
    prisma.department.count(),
    prisma.department.findMany({
      skip: page * size,
      take: size,
      orderBy,
    }),
  ]);

  return ok({
    content,
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    last: page >= Math.ceil(total / size) - 1,
  });
}
