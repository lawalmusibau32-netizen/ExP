import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ok, unauthorized, notFound } from '@/lib/api';

type Params = { params: Promise<{ questionBankId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const { questionBankId } = await params;
  const bank = await prisma.questionBank.findUnique({
    where: { id: BigInt(questionBankId) },
  });
  if (!bank) return notFound('Question bank not found');

  const questions = await prisma.question.findMany({
    where: { questionBankId: BigInt(questionBankId) },
    include: { questionBank: { select: { id: true, title: true } } },
    orderBy: { id: 'asc' },
  });

  return ok(
    questions.map((q) => ({
      ...q,
      questionBankId: q.questionBank.id,
      questionBankTitle: q.questionBank.title,
      questionBank: undefined,
    }))
  );
}
