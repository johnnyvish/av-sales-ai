import { setupDatabase } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await setupDatabase();

    return NextResponse.json({
      success: true,
      message: "Database tables created successfully",
    });
  } catch (error) {
    console.error("Database setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
