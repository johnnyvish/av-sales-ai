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

export async function isProductInquiryAI(
  emailBody: string,
  subject: string
): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini-2025-04-14",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Determine if an email is a product inquiry for AV equipment sales.

Product inquiries include: pricing, availability, quotes, specifications, recommendations, installation, or technical support for AV equipment.

Non-inquiries: thank you messages, shipping status, complaints, general business questions.

Respond with JSON: {"isProductInquiry": boolean}`,
        },
        {
          role: "user",
          content: `Email Subject: ${subject}\n\nEmail Body:\n${emailBody}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error("No content in AI response");
      return false;
    }

    const result = JSON.parse(content);
    return result.isProductInquiry === true;
  } catch (error) {
    console.error("AI product inquiry detection error:", error);
    // Fallback to false to avoid processing non-inquiries
    return false;
  }
}
