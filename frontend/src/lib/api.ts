import { NextResponse } from 'next/server';

export function ok<T>(data: T, message = 'Success') {
  return NextResponse.json({ success: true, message, data });
}

export function created<T>(data: T, message = 'Created') {
  return NextResponse.json({ success: true, message, data }, { status: 201 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message, data: null }, { status });
}

export function unauthorized(message = 'Unauthorized') {
  return fail(message, 401);
}

export function forbidden(message = 'Forbidden') {
  return fail(message, 403);
}

export function notFound(message = 'Not found') {
  return fail(message, 404);
}

export function serverError(message = 'Internal server error') {
  return fail(message, 500);
}
