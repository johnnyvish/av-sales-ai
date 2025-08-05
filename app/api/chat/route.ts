import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

interface Product {
  sku: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  dealer_price: number;
  msrp: number;
  status: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  message: string;
  products: Product[];
  chatHistory: ChatMessage[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, products, chatHistory }: ChatRequest =
      await request.json();

    const systemPrompt = `You are an AV systems expert helping a dealer find products. Here's the current product catalog:
${products
  .map(
    (p: Product) =>
      `${p.sku}: ${p.name} (${p.brand}) - ${p.category} - $${p.dealer_price}
    Description: ${p.description}
    MSRP: $${p.msrp}
    Status: ${p.status}`
  )
  .join("\n\n")}

Provide helpful responses about the products, pricing, technical specifications, compatibility, or any other AV system questions. Keep it concise and professional.`;

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt,
      },
      ...chatHistory.map((msg: ChatMessage) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages,
    });

    const response = completion.choices[0]?.message?.content || "";

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error in chat:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
