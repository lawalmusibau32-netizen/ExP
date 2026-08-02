import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, created, fail, unauthorized, forbidden } from '@/lib/api';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const courses = await prisma.course.findMany({
    orderBy: { title: 'asc' },
    include: { department: { select: { id: true, name: true } } },
  });

  return ok(
    courses.map((c) => ({
      ...c,
      departmentId: c.department.id,
      departmentName: c.department.name,
      department: undefined,
    }))
  );
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

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

  const { title, code, description, credits } = body;
  if (!title || !code || body.departmentId === undefined) {
    return fail('Title, code and departmentId are required');
  }

  const departmentId = BigInt(String(body.departmentId));
  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) return fail('Department not found', 404);

  const existing = await prisma.course.findUnique({ where: { code } });
  if (existing) return fail('Course with that code already exists', 409);

  const course = await prisma.course.create({
    data: {
      departmentId,
      title,
      code,
      description,
      credits: credits ?? 3,
    },
    include: { department: { select: { id: true, name: true } } },
  });

  return created(
    { ...course, departmentId: course.department.id, departmentName: course.department.name, department: undefined },
    'Course created'
  );
}
