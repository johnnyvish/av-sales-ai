// app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchAgentGatherProducts } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const { emailBody, subject, mode } = await request.json();

    if (!emailBody) {
      return NextResponse.json(
        { error: "Email body is required" },
        { status: 400 }
      );
    }

    const result = await searchAgentGatherProducts(emailBody, subject, mode);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Search agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
