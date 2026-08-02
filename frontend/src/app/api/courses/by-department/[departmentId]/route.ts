import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ok, unauthorized, notFound } from '@/lib/api';

type Params = { params: Promise<{ departmentId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { departmentId } = await params;
  const department = await prisma.department.findUnique({
    where: { id: BigInt(departmentId) },
  });
  if (!department) return notFound('Department not found');

  const courses = await prisma.course.findMany({
    where: { departmentId: BigInt(departmentId) },
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
