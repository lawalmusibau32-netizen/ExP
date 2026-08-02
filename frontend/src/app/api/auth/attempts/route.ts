import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole } from '@/lib/auth';
import { ok, forbidden } from '@/lib/api';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user || !hasRole(user, ['ADMIN'])) return forbidden();

  const page = Math.max(0, Number(request.nextUrl.searchParams.get('page') || 0));
  const size = Math.min(Math.max(1, Number(request.nextUrl.searchParams.get('size') || 50)), 100);
  const filter = request.nextUrl.searchParams.get('filter') === 'failed' ? false : request.nextUrl.searchParams.get('filter') === 'success' ? true : undefined;

  const [rows, total, successToday, failedToday, lockedGroups] = await Promise.all([
    prisma.loginHistory.findMany({
      skip: page * size,
      take: size,
      orderBy: { loggedAt: 'desc' },
      where: filter === undefined ? {} : { loginSuccessful: filter },
      include: { user: { select: { firstName: true, lastName: true, email: true, loginId: true, role: true } } },
    }),
    prisma.loginHistory.count({ where: filter === undefined ? {} : { loginSuccessful: filter } }),
    prisma.loginHistory.count({
      where: { loginSuccessful: true, loggedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.loginHistory.count({
      where: { loginSuccessful: false, loggedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.loginHistory.groupBy({
      by: ['userId'],
      where: { userId: { not: null }, loginSuccessful: false, loggedAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) } },
      _count: true,
    }),
  ]);

  const lockedNow = lockedGroups.filter((g) => g._count >= MAX_FAILED_ATTEMPTS).length;

  return ok({
    content: rows.map((r) => ({
      id: r.id,
      userEmail: r.user?.email ?? null,
      userLoginId: r.user?.loginId ?? null,
      userName: r.user ? `${r.user.firstName} ${r.user.lastName}` : null,
      userRole: r.user?.role ?? null,
      loginSuccessful: r.loginSuccessful,
      failureReason: r.failureReason,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      loggedAt: r.loggedAt,
    })),
    page,
    size,
    totalElements: total,
    totalPages: Math.max(1, Math.ceil(total / size)),
    last: (page + 1) * size >= total,
    stats: { successToday, failedToday, lockedNow },
  });
}
