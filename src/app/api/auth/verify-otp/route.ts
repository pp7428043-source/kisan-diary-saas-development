import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { otpStore, users, sessions } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/utils";
import { signJWT } from "@/lib/auth";
import {
  localCreateSession,
  localCreateUser,
  localFindUserByPhone,
  localFindValidOtp,
  localMarkOtpVerified,
  localUpdateUser,
} from "@/lib/local-auth-store";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  name: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(50).optional(),
  language: z.enum(["hi", "en", "mr", "pa", "te", "ta"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp, name, state, language } = schema.parse(body);

    const resolvedName = name?.trim() || `Farmer ${phone.slice(-4)}`;
    const resolvedState = state?.trim() || "India";
    const resolvedLanguage = language || "hi";

    if (hasDatabase && db) {
      const otpRecord = await db
        .select()
        .from(otpStore)
        .where(
          and(eq(otpStore.phone, phone), eq(otpStore.otp, otp), gt(otpStore.expiresAt, new Date()), eq(otpStore.verified, false))
        )
        .limit(1);

      if (!otpRecord.length) {
        return NextResponse.json(errorResponse("Invalid or expired OTP"), { status: 401 });
      }

      await db.update(otpStore).set({ verified: true }).where(eq(otpStore.id, otpRecord[0].id));

      let user = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (!user.length) {
        const [newUser] = await db
          .insert(users)
          .values({
            phone,
            username: `phone_${phone}`,
            name: resolvedName,
            state: resolvedState,
            language: resolvedLanguage,
          })
          .returning();
        user = [newUser];
      } else if (name || state || language) {
        const nextUser = {
          name: name?.trim() || user[0].name,
          state: state?.trim() || user[0].state,
          language: language || user[0].language,
        };
        await db.update(users).set(nextUser).where(eq(users.id, user[0].id));
        user[0] = { ...user[0], ...nextUser };
      }

      const token = await signJWT({ userId: user[0].id, phone });
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.insert(sessions).values({
        userId: user[0].id,
        token,
        expiresAt,
      });

      return NextResponse.json(
        successResponse(
          {
            token,
            user: {
              id: user[0].id,
              phone: user[0].phone,
              name: user[0].name,
              state: user[0].state,
              language: user[0].language,
              isAdmin: user[0].isAdmin,
            },
          },
          "Login successful"
        )
      );
    }

    const otpRecord = await localFindValidOtp(phone, otp);
    if (!otpRecord) {
      return NextResponse.json(errorResponse("Invalid or expired OTP"), { status: 401 });
    }
    await localMarkOtpVerified(otpRecord.id);

    let user = await localFindUserByPhone(phone);
    if (!user) {
      user = await localCreateUser({
        phone,
        username: `phone_${phone}`,
        name: resolvedName,
        state: resolvedState,
        language: resolvedLanguage,
      });
    } else if (name || state || language) {
      user = (await localUpdateUser(user.id, {
        name: name?.trim() || user.name,
        state: state?.trim() || user.state,
        language: language || user.language,
      })) || user;
    }

    const token = await signJWT({ userId: user.id, phone });
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
    console.error("Verify OTP error:", error);
    return NextResponse.json(errorResponse("Failed to verify OTP"), { status: 500 });
  }
}
