import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, hasRole, hashPassword } from '@/lib/auth';
import { ok, created, fail, unauthorized, forbidden } from '@/lib/api';

const USER_INCLUDE = {
  department: { select: { id: true, name: true } },
} as const;

function toDTO(user: any) {
  return {
    id: user.id,
    email: user.email,
    loginId: user.loginId,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    role: user.role,
    departmentId: user.department?.id ?? null,
    departmentName: user.department?.name ?? null,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

const LOGIN_ID_PREFIX: Record<'ADMIN' | 'LECTURER' | 'STUDENT', string> = {
  ADMIN: 'ADMIN-',
  LECTURER: 'LEC-',
  STUDENT: 'STU-',
};

async function generateLoginId(role: 'ADMIN' | 'LECTURER' | 'STUDENT') {
  const prefix = LOGIN_ID_PREFIX[role];
  const existing = await prisma.user.findMany({
    where: { loginId: { startsWith: prefix } },
    select: { loginId: true },
  });
  let max = 0;
  for (const u of existing) {
    if (!u.loginId) continue;
    const n = parseInt(u.loginId.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export async function GET(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN', 'LECTURER'])) return forbidden();

  const users = await prisma.user.findMany({
    include: USER_INCLUDE,
    orderBy: { lastName: 'asc' },
  });

  return ok(users.map(toDTO));
}

export async function POST(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return unauthorized();
  if (!hasRole(user, ['ADMIN'])) return forbidden();

  let body: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: 'ADMIN' | 'LECTURER' | 'STUDENT';
    departmentId?: string | number;
    password?: string;
    loginId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body');
  }

  const { email, firstName, lastName, role, password } = body;
  if (!email || !firstName || !lastName || !role || !password) {
    return fail('Email, firstName, lastName, role and password are required');
  }
  if (!['ADMIN', 'LECTURER', 'STUDENT'].includes(role)) {
    return fail('Invalid role');
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return fail('User with that email already exists', 409);

  const requestedId = body.loginId ? String(body.loginId).trim().toUpperCase() : null;
  if (requestedId) {
    const idDup = await prisma.user.findUnique({ where: { loginId: requestedId } });
    if (idDup) return fail('User with that ID already exists', 409);
  }
  const loginId = requestedId ?? (await generateLoginId(role));

  const userRecord = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      loginId,
      firstName,
      lastName,
      role,
      departmentId: body.departmentId !== undefined ? BigInt(String(body.departmentId)) : null,
      passwordHash: hashPassword(password),
    },
    include: USER_INCLUDE,
  });

  return created(toDTO(userRecord), 'User created');
}
