import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id: BigInt(id) },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!course) return notFound('Course not found');

  return ok({
    ...course,
    departmentId: course.department.id,
    departmentName: course.department.name,
    department: undefined,
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.course.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return notFound('Course not found');

  let body: {
    departmentId?: string | number;
    title?: string;
    code?: string;
    description?: string;
    credits?: number;
  };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  if (body.code && body.code !== existing.code) {
    const dup = await prisma.course.findUnique({ where: { code: body.code } });
    if (dup) return fail('Course with that code already exists', 409);
  }

  const course = await prisma.course.update({
    where: { id: BigInt(id) },
    data: {
      departmentId: body.departmentId !== undefined ? BigInt(String(body.departmentId)) : existing.departmentId,
      title: body.title ?? existing.title,
      code: body.code ?? existing.code,
      description: body.description !== undefined ? body.description : existing.description,
      credits: body.credits ?? existing.credits,
    },
    include: { department: { select: { id: true, name: true } } },
  });

  return ok(
    { ...course, departmentId: course.department.id, departmentName: course.department.name, department: undefined },
    'Course updated'
  );
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN'])) return forbidden();

  const { id } = await params;
  const existing = await prisma.course.findUnique({ where: { id: BigInt(id) } });
  if (!existing) return notFound('Course not found');

  const usage = await prisma.courseEnrollment.count({ where: { courseId: BigInt(id) } });
  if (usage > 0) {
    return fail('Cannot delete course with active enrollments', 409);
  }

  await prisma.course.delete({ where: { id: BigInt(id) } });
  return ok(null, 'Course deleted');
}
