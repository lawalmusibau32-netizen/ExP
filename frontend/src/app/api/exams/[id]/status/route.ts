import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, fail, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const { id } = await params;
  const exam = await prisma.exam.findUnique({ where: { id: BigInt(id) } });
  if (!exam) return notFound('Exam not found');

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const { status } = body;
  if (!status || !['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return fail('Invalid status');
  }

  if (status === 'ACTIVE') {
    const now = new Date();
    if (now < exam.startTime) {
      return fail('Exam cannot be activated before its start time');
    }
    if (now > exam.endTime) {
      return fail('Exam cannot be activated after its end time');
    }
  }

  const updated = await prisma.exam.update({
    where: { id: BigInt(id) },
    data: { status: status as any },
  });

  return ok({ id: updated.id, status: updated.status }, 'Exam status updated');
}
