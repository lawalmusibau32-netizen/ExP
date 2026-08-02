import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { signToken, comparePassword } from '@/lib/auth';
import { ok, fail, unauthorized } from '@/lib/api';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const REMEMBER_ME_EXPIRY = '7d';

function minutesRemaining(earliestFailure: Date): number {
  const remainingMs = LOCKOUT_WINDOW_MS - (Date.now() - earliestFailure.getTime());
  return Math.max(1, Math.ceil(remainingMs / 60000));
}

export async function POST(request: NextRequest) {
  let body: { identifier?: string; email?: string; password?: string; rememberMe?: boolean };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const identifier = body.identifier?.trim() || '';
  const email = body.email?.trim().toLowerCase() || '';
  const { password } = body;
  if ((!identifier && !email) || !password) {
    return fail('Student/Staff ID or email, and password are required');
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null;
  const userAgent = request.headers.get('user-agent');

  let user = null;
  if (identifier) {
    user = await prisma.user.findFirst({
      where: { loginId: { equals: identifier.toUpperCase(), mode: 'insensitive' } },
    });
  }
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (user && byEmail && String(byEmail.id) !== String(user.id)) {
      user = null;
    } else if (!user) {
      user = byEmail;
    }
  }

  const audit = async (action: string, details?: Record<string, unknown>) => {
    await prisma.auditLog.create({
      data: { userId: user?.id, action, resourceType: 'AUTH', details: details as Prisma.InputJsonValue | undefined, ipAddress, userAgent },
    });
  };
  const recordLogin = async (success: boolean, reason?: string) => {
    await prisma.loginHistory.create({
      data: {
        userId: user?.id,
        ipAddress,
        userAgent,
        loginSuccessful: success,
        failureReason: reason,
      },
    });
  };

  if (user) {
    const failedInWindow = await prisma.loginHistory.count({
      where: {
        userId: user.id,
        loginSuccessful: false,
        loggedAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) },
      },
    });
    if (failedInWindow >= MAX_FAILED_ATTEMPTS) {
      const earliest = await prisma.loginHistory.findFirst({
        where: { userId: user.id, loginSuccessful: false, loggedAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) } },
        orderBy: { loggedAt: 'asc' },
      });
      await recordLogin(false, 'ACCOUNT_LOCKED');
      await audit('LOGIN_BLOCKED', { reason: 'ACCOUNT_LOCKED', attempts: failedInWindow });
      return fail(
        `Account temporarily locked due to too many failed attempts. Try again in ${minutesRemaining(earliest!.loggedAt)} minute(s).`,
        429
      );
    }
  }

  const valid = user && user.isActive && user.passwordHash && comparePassword(password, user.passwordHash);

  if (!valid) {
    await recordLogin(false, 'INVALID_CREDENTIALS');
    await audit('LOGIN_FAILED', { reason: 'INVALID_CREDENTIALS' });
    if (!user) {
      return unauthorized('Invalid ID/email or password');
    }
    const failedCount = (await prisma.loginHistory.count({
      where: { userId: user.id, loginSuccessful: false, loggedAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) } },
    })) + 1;
    const attemptsLeft = MAX_FAILED_ATTEMPTS - failedCount;
    if (attemptsLeft <= 0) {
      const earliest = await prisma.loginHistory.findFirst({
        where: { userId: user.id, loginSuccessful: false, loggedAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) } },
        orderBy: { loggedAt: 'asc' },
      });
      return fail(
        `Account temporarily locked due to too many failed attempts. Try again in ${minutesRemaining(earliest!.loggedAt)} minute(s).`,
        429
      );
    }
    return unauthorized(`Invalid ID/email or password. ${attemptsLeft} attempt(s) remaining before temporary lockout.`);
  }

  await prisma.user.update({
    where: { id: user!.id },
    data: { lastLoginAt: new Date() },
  });

  await recordLogin(true);
  await audit('LOGIN_SUCCESS', { rememberMe: !!body.rememberMe });

  const token = signToken(
    {
      sub: String(user!.id),
      email: user!.email,
      role: user!.role,
      firstName: user!.firstName,
      lastName: user!.lastName,
    },
    body.rememberMe ? REMEMBER_ME_EXPIRY : undefined
  );

  return ok(
    {
      token,
      user: {
        id: user!.id,
        email: user!.email,
        loginId: user!.loginId,
        firstName: user!.firstName,
        lastName: user!.lastName,
        role: user!.role,
        departmentId: user!.departmentId,
        lastLoginAt: user!.lastLoginAt,
      },
    },
    'Login successful'
  );
}
