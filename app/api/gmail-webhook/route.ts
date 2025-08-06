import { NextResponse } from "next/server";
import {
  getUserWithAutomation,
  isEmailProcessed,
  markEmailAsProcessed,
} from "@/lib/db";
import { generateEmailResponse, isProductInquiryAI } from "@/lib/ai";
import { google } from "googleapis";
import { gmail_v1 } from "googleapis/build/src/apis/gmail/v1";
import fs from "fs";
import path from "path";

// Type definitions
interface User {
  id: number;
  email: string;
  access_token: string;
  refresh_token: string;
  automation_enabled: boolean;
}

type EmailData = gmail_v1.Schema$Message;

// Load product catalog
const getProductCatalog = () => {
  const catalogPath = path.join(process.cwd(), "data/products.json");
  const catalogData = fs.readFileSync(catalogPath, "utf8");
  return JSON.parse(catalogData);
};

export async function POST(request: Request) {
  try {
    // Parse Pub/Sub message format
    const body = await request.json();
    console.log("Pub/Sub webhook received:", body);

    // Pub/Sub sends messages in this format:
    // { message: { data: base64EncodedData, attributes: {}, messageId: "", publishTime: "" } }
    if (body.message && body.message.data) {
      // Decode the Pub/Sub message data
      const pubsubData = JSON.parse(
        Buffer.from(body.message.data, "base64").toString()
      );

      console.log("Decoded Pub/Sub data:", pubsubData);

      // Gmail Pub/Sub notification contains: { emailAddress, historyId }
      const { emailAddress } = pubsubData;

      if (!emailAddress) {
        console.log("No emailAddress in Pub/Sub message");
        return NextResponse.json({ message: "No email address provided" });
      }

      // Get user from database
      const user = await getUserWithAutomation(emailAddress);

      if (!user) {
        console.log(
          `User not found or automation disabled for: ${emailAddress}`
        );
        return NextResponse.json({
          message: "User not found or automation disabled",
        });
      }

      console.log(`Processing emails for user: ${emailAddress}`);

      // Set up Gmail API
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        access_token: user.access_token,
        refresh_token: user.refresh_token,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      // Get recent unread messages
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10,
        q: "is:unread",
      });

      console.log(
        `Found ${response.data.messages?.length || 0} unread messages`
      );

      if (response.data.messages) {
        for (const message of response.data.messages) {
          if (!message.id) continue;

          // Check if we've already processed this email
          const isProcessed = await isEmailProcessed(message.id);

          if (!isProcessed) {
            console.log(`Processing new email: ${message.id}`);
            // Process this new email
            await processEmail(gmail, message.id, user);
          } else {
            console.log(`Email already processed: ${message.id}`);
          }
        }
      }
    }

    // Always return 200 OK to acknowledge the Pub/Sub message
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pub/Sub webhook error:", error);
    // Still return 200 to avoid Pub/Sub retries on permanent failures
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 200 }
    );
  }
}

async function processEmail(
  gmail: gmail_v1.Gmail,
  messageId: string,
  user: User
) {
  try {
    // Get email content
    const email = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const emailBody = extractEmailBody(email.data);
    const subject = getEmailSubject(email.data);
    const fromEmail = getFromEmail(email.data);

    console.log("Processing email:", subject);
    console.log("From:", fromEmail);
    console.log("Email body preview:", emailBody.substring(0, 200) + "...");

    // Skip emails from the user themselves (avoid loops)
    if (fromEmail && fromEmail.includes(user.email)) {
      console.log("Skipping email from self");
      await markEmailAsProcessed(messageId, user.id);
      return;
    }

    // Check if this looks like a product inquiry using AI
    const isInquiry = await isProductInquiryAI(emailBody, subject);

    if (isInquiry) {
      console.log("Email identified as product inquiry by AI");
      const productCatalog = getProductCatalog();

      // Use AI to analyze email and generate response
      const aiResponse = await generateEmailResponse(
        emailBody,
        subject,
        productCatalog
      );

      if (aiResponse) {
        // Send reply
        await sendReply(gmail, email.data, aiResponse);

        // Mark as processed
        await markEmailAsProcessed(messageId, user.id);

        console.log("Email processed and reply sent successfully");
      }
    } else {
      console.log("Email not identified as product inquiry by AI, skipping");
      // Still mark as processed to avoid reprocessing
      await markEmailAsProcessed(messageId, user.id);
    }
  } catch (error) {
    console.error("Error processing email:", error);
    // Mark as processed even on error to avoid infinite retries
    await markEmailAsProcessed(messageId, user.id);
  }
}

function extractEmailBody(emailData: EmailData): string {
  // Extract text from email body
  let body = "";

  if (emailData.payload?.body?.data) {
    body = Buffer.from(emailData.payload.body.data, "base64").toString();
  } else if (emailData.payload?.parts) {
    for (const part of emailData.payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        body += Buffer.from(part.body.data, "base64").toString();
      }
    }
  }

  return body;
}

function getEmailSubject(emailData: EmailData): string {
  const subjectHeader = emailData.payload?.headers?.find(
    (h) => h.name === "Subject"
  );
  return subjectHeader?.value || "";
}

function getFromEmail(emailData: EmailData): string {
  const fromHeader = emailData.payload?.headers?.find((h) => h.name === "From");
  return fromHeader?.value || "";
}

async function sendReply(
  gmail: gmail_v1.Gmail,
  originalEmail: EmailData,
  replyContent: string
): Promise<void> {
  try {
    const subject = getEmailSubject(originalEmail);
    const fromHeader = originalEmail.payload?.headers?.find(
      (h) => h.name === "From"
    );
    if (!fromHeader) {
      throw new Error("From header not found in email");
    }
    const toEmail = fromHeader.value;

    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

    const emailLines = [
      `To: ${toEmail}`,
      `Subject: ${replySubject}`,
      `In-Reply-To: ${originalEmail.id}`,
      `References: ${originalEmail.id}`,
      "",
      replyContent,
    ];

    const email = emailLines.join("\n");
    const encodedEmail = Buffer.from(email).toString("base64url");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log("Reply sent successfully");
  } catch (error) {
    console.error("Error sending reply:", error);
    throw error;
  }
}
