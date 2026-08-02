import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api';

export async function GET(request: NextRequest) {
  let dbUp = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbUp = false;
  }

  return ok(
    {
      status: dbUp ? 'UP' : 'DEGRADED',
      database: dbUp ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
    },
    'Health check'
  );
}
