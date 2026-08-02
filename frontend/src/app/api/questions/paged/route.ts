import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ok, unauthorized } from '@/lib/api';

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '0');
  const size = parseInt(url.searchParams.get('size') || '20');
  const sortBy = url.searchParams.get('sortBy') || 'id';
  const direction = url.searchParams.get('direction') || 'asc';

  const orderBy = { [sortBy]: direction } as const;
  const [total, content] = await Promise.all([
    prisma.question.count(),
    prisma.question.findMany({
      skip: page * size,
      take: size,
      orderBy,
      include: { questionBank: { select: { id: true, title: true } } },
    }),
  ]);

  return ok({
    content: content.map((q) => ({
      ...q,
      questionBankId: q.questionBank.id,
      questionBankTitle: q.questionBank.title,
      questionBank: undefined,
    })),
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
    last: page >= Math.ceil(total / size) - 1,
  });
}
