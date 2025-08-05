import { NextResponse } from "next/server";
import { generateEmailResponse } from "@/lib/ai";
import fs from "fs";
import path from "path";

// Load product catalog
const getProductCatalog = () => {
  const catalogPath = path.join(process.cwd(), "data/products.json");
  const catalogData = fs.readFileSync(catalogPath, "utf8");
  return JSON.parse(catalogData);
};

export async function POST(request: Request) {
  try {
    const { emailBody, subject } = await request.json();

    console.log("Testing email processing...");
    console.log("Subject:", subject);
    console.log("Body:", emailBody);

    // Check if this looks like a product inquiry
    const isInquiry = isProductInquiry(emailBody);
    console.log("Is product inquiry:", isInquiry);

    if (isInquiry) {
      const productCatalog = getProductCatalog();

      // Generate AI response
      const aiResponse = await generateEmailResponse(
        emailBody,
        subject,
        productCatalog
      );

      return NextResponse.json({
        success: true,
        isProductInquiry: isInquiry,
        aiResponse: aiResponse,
        productCatalog: productCatalog.products.length + " products loaded",
      });
    } else {
      return NextResponse.json({
        success: true,
        isProductInquiry: false,
        message: "Email does not appear to be a product inquiry",
      });
    }
  } catch (error) {
    console.error("Test processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function isProductInquiry(emailBody: string) {
  const inquiryKeywords = [
    "price",
    "cost",
    "available",
    "stock",
    "do you have",
    "quote",
    "rx",
    "projector",
    "epson",
    "avpro",
    "hdmi",
    "video",
  ];

  const lowerBody = emailBody.toLowerCase();
  return inquiryKeywords.some((keyword) => lowerBody.includes(keyword));
}
