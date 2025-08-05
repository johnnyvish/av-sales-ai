import OpenAI from "openai";

interface ProductCatalog {
  [key: string]: unknown;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmailResponse(
  emailBody: string,
  subject: string,
  productCatalog: ProductCatalog
): Promise<string | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini-2025-04-14",
      messages: [
        {
          role: "system",
          content: `You are an AV equipment sales assistant. Analyze customer emails and respond with relevant product information and pricing from the catalog. Be professional and helpful.

Product Catalog:
${JSON.stringify(productCatalog, null, 2)}

Guidelines:
- If customer asks about specific products, provide exact matches
- Include pricing and availability
- Suggest compatible products when relevant
- Keep responses professional and concise
- If no exact match, suggest similar products
- Always include pricing when available
- Sign emails as "Best regards, AV Sales Team"`,
        },
        {
          role: "user",
          content: `Customer Email Subject: ${subject}\n\nCustomer Email:\n${emailBody}`,
        },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI response generation error:", error);
    return null;
  }
}
