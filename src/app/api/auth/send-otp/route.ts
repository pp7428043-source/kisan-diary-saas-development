import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db, hasDatabase } from "@/db";
import { otpStore } from "@/db/schema";
import { generateOTP, successResponse, errorResponse } from "@/lib/utils";
import { localCreateOtp, localFindOrCreateOtp } from "@/lib/local-auth-store";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = schema.parse(body);

    if (hasDatabase && db) {
      const existing = await db
        .select()
        .from(otpStore)
        .where(
          and(eq(otpStore.phone, phone), gt(otpStore.expiresAt, new Date()), eq(otpStore.verified, false))
        )
        .limit(1);

      if (existing.length > 0) {
        const timeLeft = Math.ceil((existing[0].expiresAt.getTime() - Date.now()) / 1000);
        return NextResponse.json(
          errorResponse(`Please wait ${timeLeft}s before requesting a new OTP`),
          { status: 429 }
        );
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await db.insert(otpStore).values({
        phone,
        otp,
        expiresAt,
      });

      console.log(`OTP for ${phone}: ${otp}`);

      return NextResponse.json(
        successResponse(
          { phone, expiresIn: 300, otp },
          "OTP sent successfully"
        )
      );
    }

    const existing = await localFindOrCreateOtp(phone);
    if (existing) {
      const timeLeft = Math.ceil((new Date(existing.expiresAt).getTime() - Date.now()) / 1000);
      return NextResponse.json(
        errorResponse(`Please wait ${timeLeft}s before requesting a new OTP`),
        { status: 429 }
      );
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await localCreateOtp(phone, otp, expiresAt);
    console.log(`OTP for ${phone}: ${otp}`);

    return NextResponse.json(
      successResponse(
        { phone, expiresIn: 300, otp },
        "OTP sent successfully"
      )
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        errorResponse(error.issues[0]?.message ?? "Validation error"),
        { status: 400 }
      );
    }
    console.error("Send OTP error:", error);
    return NextResponse.json(errorResponse("Failed to send OTP"), { status: 500 });
  }
}
