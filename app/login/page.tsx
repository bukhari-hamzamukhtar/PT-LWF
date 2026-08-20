import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LockScreen from "@/components/LockScreen";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

function sanitizeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  const authenticated = await isValidSessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  const { next } = await searchParams;
  const nextPath = sanitizeNextPath(next);

  if (authenticated) {
    redirect(nextPath);
  }

  return <LockScreen nextPath={nextPath} />;
}
