import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { signJWT } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  phone: z.string(),
  password: z.string(),
});

// Admin login - simple password-based for the admin dashboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password } = schema.parse(body);

    // Admin password from env
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (password !== adminPassword) {
      return NextResponse.json(errorResponse("Invalid credentials"), { status: 401 });
    }

    // Find or create admin user
    let adminUser = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!adminUser.length) {
      const [newAdmin] = await db.insert(users).values({
        phone,
        name: "Admin",
        state: "Delhi",
        language: "en",
        isAdmin: true,
      }).returning();
      adminUser = [newAdmin];
    } else if (!adminUser[0].isAdmin) {
      return NextResponse.json(errorResponse("Not an admin account"), { status: 403 });
    }

    const token = await signJWT({ userId: adminUser[0].id, phone, isAdmin: true });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(sessions).values({
      userId: adminUser[0].id,
      token,
      expiresAt,
    });

    const response = NextResponse.json(
      successResponse({ token, user: adminUser[0] }, "Admin login successful")
    );

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      expires: expiresAt,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues;
      return NextResponse.json(errorResponse(issues[0]?.message ?? "Validation error"), { status: 400 });
    }
    console.error("Admin login error:", error);
    return NextResponse.json(errorResponse("Login failed"), { status: 500 });
  }
}
