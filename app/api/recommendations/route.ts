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

interface RecommendationRequest {
  selectedItems: Product[];
  products: Product[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { selectedItems, products }: RecommendationRequest =
      await request.json();

    const prompt = `You are an AV systems expert. Based on these selected products:
${selectedItems
  .map(
    (
      p: Product
    ) => `- ${p.sku}: ${p.name} (${p.brand}) - ${p.category} - $${p.dealer_price}
    Description: ${p.description}
    MSRP: $${p.msrp}
    Status: ${p.status}`
  )
  .join("\n\n")}

From this product catalog:
${products
  .map(
    (
      p: Product
    ) => `${p.sku}: ${p.name} (${p.brand}) - ${p.category} - $${p.dealer_price}
    Description: ${p.description}
    MSRP: $${p.msrp}
    Status: ${p.status}`
  )
  .join("\n\n")}

Recommend 3-5 complementary products that would complete this AV system. Consider power supplies, cables, mounting hardware, and compatible devices.

Respond with ONLY a JSON array in this format:
[
  {
    "sku": "product_sku",
    "reason": "Brief explanation why this is needed"
  }
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || "";
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const recommendations = JSON.parse(cleanedResponse);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
