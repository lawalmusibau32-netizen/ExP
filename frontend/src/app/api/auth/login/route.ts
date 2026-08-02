import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken, comparePassword } from '@/lib/auth';
import { ok, fail, unauthorized } from '@/lib/api';

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const { email, password } = body;
  if (!email || !password) {
    return fail('Email and password are required');
  }

  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null;
  const userAgent = request.headers.get('user-agent');

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

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

  if (!user || !user.isActive || !user.passwordHash || !comparePassword(password, user.passwordHash)) {
    await recordLogin(false, 'INVALID_CREDENTIALS');
    return unauthorized('Invalid email or password');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await recordLogin(true);

  const token = signToken({
    sub: String(user.id),
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  });

  return ok({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departmentId: user.departmentId,
      lastLoginAt: user.lastLoginAt,
    },
  }, 'Login successful');
}
