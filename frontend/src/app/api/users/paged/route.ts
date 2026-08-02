import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, unauthorized, forbidden } from '@/lib/api';

const USER_INCLUDE = {
  department: { select: { id: true, name: true } },
} as const;

function toDTO(user: any) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    role: user.role,
    departmentId: user.department?.id ?? null,
    departmentName: user.department?.name ?? null,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '0');
  const size = parseInt(url.searchParams.get('size') || '20');
  const sortBy = url.searchParams.get('sortBy') || 'lastName';
  const direction = url.searchParams.get('direction') || 'asc';

  const orderBy = { [sortBy]: direction } as const;
  const [total, content] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      skip: page * size,
      take: size,
      orderBy,
      include: USER_INCLUDE,
    }),
  ]);

  return ok({
    content: content.map(toDTO),
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    last: page >= Math.ceil(total / size) - 1,
  });
}
