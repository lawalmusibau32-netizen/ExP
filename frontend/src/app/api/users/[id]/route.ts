import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole, hashPassword } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

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

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { id } = await params;
  const found = await prisma.user.findUnique({
    where: { id: BigInt(id) },
    include: USER_INCLUDE,
  });
  if (!found) return notFound('User not found');

  return ok(toDTO(found));
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return notFound('User not found');

  let body: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: 'ADMIN' | 'LECTURER' | 'STUDENT';
    departmentId?: string | number | null;
    isActive?: boolean;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  if (body.email && body.email.toLowerCase() !== existing.email) {
    const dup = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (dup) return fail('User with that email already exists', 409);
  }

  const updated = await prisma.user.update({
    where: { id: BigInt(id) },
    data: {
      email: body.email ? body.email.toLowerCase() : existing.email,
      firstName: body.firstName ?? existing.firstName,
      lastName: body.lastName ?? existing.lastName,
      role: (body.role as any) ?? existing.role,
      departmentId:
        body.departmentId === null
          ? null
          : body.departmentId !== undefined
            ? BigInt(String(body.departmentId))
            : existing.departmentId,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
      passwordHash: body.password ? hashPassword(body.password) : existing.passwordHash,
    },
    include: USER_INCLUDE,
  });

  return ok(toDTO(updated), 'User updated');
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return notFound('User not found');

  await prisma.user.delete({ where: { id: BigInt(id) } });
  return ok(null, 'User deleted');
}
