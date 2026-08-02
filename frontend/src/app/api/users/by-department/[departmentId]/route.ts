import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ departmentId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { departmentId } = await params;
  const department = await prisma.department.findUnique({
    where: { id: BigInt(departmentId) },
  });
  if (!department) return notFound('Department not found');

  const users = await prisma.user.findMany({
    where: { departmentId: BigInt(departmentId) },
    include: { department: { select: { id: true, name: true } } },
    orderBy: { lastName: 'asc' },
  });

  return ok(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`,
      role: u.role,
      departmentId: u.department?.id ?? null,
      departmentName: u.department?.name ?? null,
      isActive: u.isActive,
    }))
  );
}
