import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return fail('Email is required');

  const user = await prisma.user.findUnique({ where: { email } });

  await prisma.auditLog.create({
    data: {
      userId: user?.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resourceType: 'AUTH',
      details: user ? undefined : { unknownEmail: email },
      ipAddress: null,
      userAgent: null,
    },
  });

  return ok(null, 'If an account exists for that email, an administrator will assist with resetting your password. Contact admin@exams.local for support.');
}
