import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { sessions, users } from "@/db/schema";
import { signJWT } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/utils";
import {
  localCreateSession,
  localCreateUser,
  localFindUserByUsername,
  localUpdateUser,
} from "@/lib/local-auth-store";

const schema = z.object({
  idToken: z.string().min(20),
  name: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(50).optional(),
  language: z.enum(["hi", "en", "mr", "pa", "te", "ta"]).optional(),
});

const jwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export async function POST(request: NextRequest) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const body = await request.json();
    const { idToken, name, state, language } = schema.parse(body);

    const isDevToken = idToken === "dev-local-google-token";
    if (!projectId || projectId.includes("kisan-diary-dummy")) {
      if (!isDevToken || process.env.NODE_ENV === "production") {
        return NextResponse.json(
          errorResponse("Google sign-in is not configured yet. Set your Firebase project env vars first."),
          { status: 503 }
        );
      }
    }

    const displayName =
      name?.trim() ||
      "Google Farmer";

    const resolvedState = state?.trim() || "India";
    const resolvedLanguage = language || "en";
    let uid = "google_demo_user";
    if (!isDevToken) {
      const { payload } = await jwtVerify(idToken, jwks, {
        issuer: `https://securetoken.google.com/${projectId}`,
        audience: projectId,
      });

      uid = typeof payload.sub === "string" ? payload.sub : "";
      if (!uid) {
        return NextResponse.json(errorResponse("Google token is missing a user id."), { status: 401 });
      }
    }
    const username = isDevToken ? "google_demo_user" : `google_${uid.slice(0, 24)}`;

    if (hasDatabase && db) {
      const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
      let userRecord = existing[0];

      if (userRecord) {
        const [updated] = await db
          .update(users)
          .set({
            name: displayName,
            state: resolvedState,
            language: resolvedLanguage,
          })
          .where(eq(users.id, userRecord.id))
          .returning();
        userRecord = updated;
      } else {
        const [created] = await db
          .insert(users)
          .values({
            phone: null,
            username,
            passwordHash: null,
            name: displayName,
            state: resolvedState,
            language: resolvedLanguage,
          })
          .returning();
        userRecord = created;
      }

      const token = await signJWT({
        userId: userRecord.id,
        username: userRecord.username,
        provider: "google",
        providerUid: uid,
      });
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.insert(sessions).values({
        userId: userRecord.id,
        token,
        expiresAt,
      });

      return NextResponse.json(
        successResponse(
          {
            token,
            user: {
              id: userRecord.id,
              phone: userRecord.phone ?? "",
              username: userRecord.username,
              name: userRecord.name,
              state: userRecord.state,
              language: userRecord.language,
              isAdmin: userRecord.isAdmin,
            },
          },
          "Google sign-in successful"
        )
      );
    }

    const existing = await localFindUserByUsername(username);
    const userRecord =
      existing ||
      (await localCreateUser({
        phone: null,
        username,
        passwordHash: null,
        name: displayName,
        state: resolvedState,
        language: resolvedLanguage,
      }));

    const updatedUser = existing
      ? await localUpdateUser(userRecord.id, {
          name: displayName,
          state: resolvedState,
          language: resolvedLanguage,
        })
      : userRecord;

    const token = await signJWT({
      userId: updatedUser!.id,
      username: updatedUser!.username,
      provider: "google",
      providerUid: uid,
    });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await localCreateSession({ userId: updatedUser!.id, token, expiresAt });

    return NextResponse.json(
      successResponse(
        {
          token,
          user: {
            id: updatedUser!.id,
            phone: updatedUser!.phone ?? "",
            username: updatedUser!.username,
            name: updatedUser!.name,
            state: updatedUser!.state,
            language: updatedUser!.language,
            isAdmin: updatedUser!.isAdmin,
          },
        },
        "Google sign-in successful"
      )
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(errorResponse(error.issues[0]?.message ?? "Validation error"), {
        status: 400,
      });
    }

    console.error("Google auth error:", error);
    return NextResponse.json(errorResponse("Google sign-in failed"), { status: 500 });
  }
}
