/**
 * Minimal server-side session handling for the Project Topi lock screen.
 *
 * Design: the person unlocks the app with a single shared password
 * (ADMIN_PASSWORD, defaults to "ahmadshah"). On success we set an httpOnly
 * cookie whose value is a SHA-256 digest of the password plus a fixed
 * suffix — never the password itself. Middleware recomputes the same
 * digest on every request and compares it to the cookie, so the check
 * happens on the server, not just in client-side React state. If the
 * password is ever changed, every previously issued cookie stops working
 * automatically.
 *
 * This intentionally uses the Web Crypto API (`crypto.subtle`) rather than
 * Node's `crypto` module, because it needs to run identically inside
 * Next.js Middleware (Edge runtime) and inside API routes (Node runtime).
 */

export const SESSION_COOKIE_NAME = "pt_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SESSION_SUFFIX = "project-topi-session-v1";

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "ahmadshah";
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hashBuffer));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getExpectedSessionToken(): Promise<string> {
  return sha256Hex(`${getAdminPassword()}:${SESSION_SUFFIX}`);
}

export async function isCorrectPassword(candidate: string): Promise<boolean> {
  return candidate === getAdminPassword();
}

export async function isValidSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await getExpectedSessionToken();
  return token === expected;
}
