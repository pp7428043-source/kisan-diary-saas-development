import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { users, sessions } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils";
import { signJWT } from "@/lib/auth";
import { localCreateSession, localFindUserByUsername } from "@/lib/local-auth-store";

const schema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = schema.parse(body);
    const passwordHash = await hashPassword(password);

    if (hasDatabase && db) {
      const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.username, username.toLowerCase()))
        .limit(1);

      if (!userRecord.length) {
        return NextResponse.json(errorResponse("गलत यूज़रनेम या पासवर्ड"), { status: 401 });
      }

      const user = userRecord[0];
      if (user.passwordHash !== passwordHash) {
        return NextResponse.json(errorResponse("गलत यूज़रनेम या पासवर्ड"), { status: 401 });
      }

      const token = await signJWT({ userId: user.id, username: user.username });
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(sessions).values({
        userId: user.id,
        token,
        expiresAt,
      });

      return NextResponse.json(
        successResponse(
          {
            token,
            user: {
              id: user.id,
              phone: user.phone ?? "",
              name: user.name,
              state: user.state,
              language: user.language,
              isAdmin: user.isAdmin,
              username: user.username,
            },
          },
          "Login successful"
        )
      );
    }

    const user = await localFindUserByUsername(username.toLowerCase());
    if (!user || user.passwordHash !== passwordHash) {
      return NextResponse.json(errorResponse("गलत यूज़रनेम या पासवर्ड"), { status: 401 });
    }

    const token = await signJWT({ userId: user.id, username: user.username });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await localCreateSession({ userId: user.id, token, expiresAt });

    return NextResponse.json(
      successResponse(
        {
          token,
          user: {
            id: user.id,
            phone: user.phone ?? "",
            name: user.name,
            state: user.state,
            language: user.language,
            isAdmin: user.isAdmin,
            username: user.username,
          },
        },
        "Login successful"
      )
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        errorResponse(error.issues[0]?.message ?? "Validation error"),
        { status: 400 }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(errorResponse("Login failed"), { status: 500 });
  }
}
