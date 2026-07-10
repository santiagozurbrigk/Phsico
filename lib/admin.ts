import crypto from "crypto";
import type { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE_NAME = "admin_session";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8; // 8 horas

function getExpectedSessionValue(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;

  return crypto
    .createHmac("sha256", password)
    .update("verdadero-o-falso-admin-session")
    .digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function isValidAdminPassword(password: string): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD);
}

export function isAdminRequest(request: NextRequest | Request): boolean {
  const expected = getExpectedSessionValue();
  if (!expected) return false;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`));

  if (!sessionCookie) return false;

  const [, value] = sessionCookie.split("=");
  if (!value) return false;

  return safeCompare(value, expected);
}

export function setAdminSessionCookie(response: NextResponse): void {
  const sessionValue = getExpectedSessionValue();
  if (!sessionValue) return;

  response.cookies.set(ADMIN_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: "/",
  });
}
