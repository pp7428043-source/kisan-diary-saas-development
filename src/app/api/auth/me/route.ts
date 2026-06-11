import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
    }

    return NextResponse.json(
      successResponse({
        id: user.id,
        phone: user.phone,
        name: user.name,
        state: user.state,
        language: user.language,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      })
    );
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json(errorResponse("Failed to get user"), { status: 500 });
  }
}
