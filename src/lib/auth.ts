import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  localFindSession,
  localFindUserByPhone,
  localFindUserByUsername,
} from "@/lib/local-auth-store";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "kisan-diary-secret-key-2024-secure"
);

export async function signJWT(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload || typeof payload.userId !== "string") return null;

  if (!hasDatabase || !db) {
    const session = await localFindSession(token);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;

    const tokenPhone = typeof payload.phone === "string" ? payload.phone : null;
    const tokenUsername = typeof payload.username === "string" ? payload.username : null;

    if (tokenPhone) {
      return (await localFindUserByPhone(tokenPhone)) || null;
    }
    if (tokenUsername) {
      return (await localFindUserByUsername(tokenUsername)) || null;
    }

    return null;
  }

  const session = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session.length) return null;

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId as string))
    .limit(1);

  return user[0] || null;
}

export async function getAdminUser(request: Request) {
  const user = await getAuthUser(request);
  if (!user?.isAdmin) return null;
  return user;
}

export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload || typeof payload.userId !== "string") return null;

    if (!hasDatabase || !db) {
      const session = await localFindSession(token);
      if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;
      return null;
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId as string))
      .limit(1);

    return user[0]?.isAdmin ? user[0] : null;
  } catch {
    return null;
  }
}
