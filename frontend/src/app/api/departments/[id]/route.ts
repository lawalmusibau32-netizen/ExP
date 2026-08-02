import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const department = await prisma.department.findUnique({
    where: { id: BigInt(id) },
  });
  if (!department) return notFound('Department not found');

  return ok(department);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.department.findUnique({
    where: { id: BigInt(id) },
  });
  if (!existing) return notFound('Department not found');

  let body: { name?: string; code?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const duplicate = await prisma.department.findFirst({
    where: {
      id: { not: BigInt(id) },
      OR: [
        { name: body.name ?? '' },
        { code: body.code ?? '' },
      ],
    },
  });
  if (duplicate) {
    return fail('Department with that name or code already exists', 409);
  }

  const department = await prisma.department.update({
    where: { id: BigInt(id) },
    data: {
      name: body.name ?? existing.name,
      code: body.code ?? existing.code,
      description: body.description !== undefined ? body.description : existing.description,
    },
  });

  return ok(department, 'Department updated');
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.department.findUnique({
    where: { id: BigInt(id) },
    include: { courses: { select: { id: true } }, users: { select: { id: true } } },
  });
  if (!existing) return notFound('Department not found');
  if (existing.courses.length > 0 || existing.users.length > 0) {
    return fail('Cannot delete department with courses or users assigned', 409);
  }

  await prisma.department.delete({ where: { id: BigInt(id) } });
  return ok(null, 'Department deleted');
}
