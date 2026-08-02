import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, created, fail, unauthorized, forbidden } from '@/lib/api';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  return ok(departments);
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN'])) return forbidden();

  let body: { name?: string; code?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const { name, code, description } = body;
  if (!name || !code) {
    return fail('Name and code are required');
  }

  const existing = await prisma.department.findFirst({
    where: { OR: [{ name }, { code }] },
  });
  if (existing) {
    return fail('Department with that name or code already exists', 409);
  }

  const department = await prisma.department.create({
    data: { name, code, description },
  });

  return created(department, 'Department created');
}
