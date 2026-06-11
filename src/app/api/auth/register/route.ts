import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { users, sessions } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils";
import { signJWT } from "@/lib/auth";
import {
  localCreateSession,
  localCreateUser,
  localFindUserByUsername,
} from "@/lib/local-auth-store";

const schema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot be longer than 30 characters")
    .regex(/^[a-z0-9_]+$/, "Username may contain only letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  state: z.string().min(2).max(50),
  language: z.enum(["hi", "en", "mr", "pa", "te", "ta"]).optional().default("hi"),
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
    const { username, password, name, state, language } = schema.parse(body);
    const normalizedUsername = username.toLowerCase();
    const passwordHash = await hashPassword(password);

    if (hasDatabase && db) {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, normalizedUsername))
        .limit(1);

      if (existing.length) {
        return NextResponse.json(
          errorResponse("यह यूज़रनेम पहले से लिया जा चुका है। दूसरा चुनें।"),
          { status: 409 }
        );
      }

      const [newUser] = await db
        .insert(users)
        .values({
          username: normalizedUsername,
          passwordHash,
          name,
          state,
          language,
          phone: `usr_${normalizedUsername}`,
        })
        .returning();

      const token = await signJWT({ userId: newUser.id, username: newUser.username });
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(sessions).values({
        userId: newUser.id,
        token,
        expiresAt,
      });

      return NextResponse.json(
        successResponse(
          {
            token,
            user: {
              id: newUser.id,
              phone: newUser.phone ?? "",
              name: newUser.name,
              state: newUser.state,
              language: newUser.language,
              isAdmin: newUser.isAdmin,
              username: newUser.username,
            },
          },
          "Account created successfully"
        ),
        { status: 201 }
      );
    }

    const existing = await localFindUserByUsername(normalizedUsername);
    if (existing) {
      return NextResponse.json(
        errorResponse("यह यूज़रनेम पहले से लिया जा चुका है। दूसरा चुनें।"),
        { status: 409 }
      );
    }

    const newUser = await localCreateUser({
      username: normalizedUsername,
      passwordHash,
      name,
      state,
      language,
      phone: `usr_${normalizedUsername}`,
    });

    const token = await signJWT({ userId: newUser.id, username: newUser.username });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await localCreateSession({ userId: newUser.id, token, expiresAt });

    return NextResponse.json(
      successResponse(
        {
          token,
          user: {
            id: newUser.id,
            phone: newUser.phone ?? "",
            name: newUser.name,
            state: newUser.state,
            language: newUser.language,
            isAdmin: newUser.isAdmin,
            username: newUser.username,
          },
        },
        "Account created successfully"
      ),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        errorResponse(error.issues[0]?.message ?? "Validation error"),
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(errorResponse("Registration failed"), { status: 500 });
  }
}
