import { NextResponse } from 'next/server';

function bigIntReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}

function jsonResponse(body: unknown, status: number) {
  return new NextResponse(JSON.stringify(body, bigIntReplacer), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function ok<T>(data: T, message = 'Success') {
  return jsonResponse({ success: true, message, data }, 200);
}

export function created<T>(data: T, message = 'Created') {
  return jsonResponse({ success: true, message, data }, 201);
}

export function fail(message: string, status = 400) {
  return jsonResponse({ success: false, message, data: null }, status);
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
