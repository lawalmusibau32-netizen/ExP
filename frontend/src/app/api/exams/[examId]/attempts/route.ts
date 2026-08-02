import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ok, unauthorized, forbidden, notFound } from '@/lib/api';

type Params = { params: Promise<{ examId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { examId } = await params;
  const exam = await prisma.exam.findUnique({ where: { id: BigInt(examId) } });
  if (!exam) return notFound('Exam not found');

  if (user.role === 'STUDENT') {
    const attempts = await prisma.examAttempt.findMany({
      where: { examId: BigInt(examId), studentId: BigInt(user.sub) },
      orderBy: { attemptNumber: 'desc' },
    });
    return ok(attempts);
  }

  const attempts = await prisma.examAttempt.findMany({
    where: { examId: BigInt(examId) },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      result: true,
    },
    orderBy: { startedAt: 'desc' },
  });

  return ok(
    attempts.map((a) => ({
      id: a.id,
      examId: a.examId,
      studentId: a.studentId,
      studentName: `${a.student.firstName} ${a.student.lastName}`,
      studentEmail: a.student.email,
      attemptNumber: a.attemptNumber,
      status: a.status,
      tabSwitchCount: a.tabSwitchCount,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      ipAddress: a.ipAddress,
      result: a.result,
    }))
  );
}
