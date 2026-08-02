import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ role: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { role } = await params;
  if (!['ADMIN', 'LECTURER', 'STUDENT'].includes(role.toUpperCase())) {
    return notFound('Invalid role');
  }

  const users = await prisma.user.findMany({
    where: { role: role.toUpperCase() as any },
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
