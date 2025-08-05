import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateUserAutomation } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enabled } = await request.json();

    await updateUserAutomation(session.user.email!, enabled);

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error("Toggle automation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
