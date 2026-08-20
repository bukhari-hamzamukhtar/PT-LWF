import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getExpectedSessionToken,
  isCorrectPassword,
} from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let password = "";

  try {
    const body = await request.json();
    if (typeof body?.password === "string") {
      password = body.password;
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ error: "Enter the password." }, { status: 400 });
  }

  const correct = await isCorrectPassword(password);
  if (!correct) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await getExpectedSessionToken();
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
