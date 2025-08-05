import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { updateUserAutomation, getUserTokens } from "@/lib/db";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enabled } = await request.json();

    // Update automation status in database
    await updateUserAutomation(session.user.email!, enabled);

    // Handle Gmail watch based on automation status
    if (enabled) {
      // Enable Gmail watch
      const watchResult = await enableGmailWatch(session.user.email!);
      if (!watchResult.success) {
        console.error("Failed to enable Gmail watch:", watchResult.error);
        // Don't fail the whole request, just log the error
      }
    } else {
      // Disable Gmail watch
      const stopResult = await disableGmailWatch(session.user.email!);
      if (!stopResult.success) {
        console.error("Failed to disable Gmail watch:", stopResult.error);
        // Don't fail the whole request, just log the error
      }
    }

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error("Toggle automation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function enableGmailWatch(email: string) {
  try {
    // Get user tokens
    const tokens = await getUserTokens(email);
    if (!tokens) {
      return { success: false, error: "User tokens not found" };
    }

    // Set up Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Enable Gmail watch
    const response = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: "projects/finao-468122/topics/gmail-notifications",
        labelIds: ["INBOX"],
      },
    });

    console.log("Gmail watch enabled for:", email, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error enabling Gmail watch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function disableGmailWatch(email: string) {
  try {
    // Get user tokens
    const tokens = await getUserTokens(email);
    if (!tokens) {
      return { success: false, error: "User tokens not found" };
    }

    // Set up Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Stop Gmail watch
    await gmail.users.stop({
      userId: "me",
    });

    console.log("Gmail watch disabled for:", email);
    return { success: true };
  } catch (error) {
    console.error("Error disabling Gmail watch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
