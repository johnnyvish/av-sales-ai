import OpenAI from "openai";

type ProductCatalog = string;

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
      model: "o3-2025-04-16",
      messages: [
        {
          role: "system",
          content: `You are an AV equipment sales assistant. Analyze customer emails and respond with relevant product information and pricing from the catalog. Be professional and helpful.

Product Catalog (CSV format):
${productCatalog}

Guidelines:
- If customer asks about specific products, provide exact matches
- Include pricing and availability
- Suggest compatible products when relevant
- Keep responses professional and concise
- If no exact match, suggest similar products
- Always include pricing when available
- Sign emails as "Best regards, The New York Marketing Team"`,
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

export async function generateUpsellResponse(
  emailBody: string,
  subject: string,
  productCatalog: ProductCatalog
): Promise<string | null> {
  try {
    const response = await openai.chat.completions.create({
      model: "o3-2025-04-16",
      messages: [
        {
          role: "system",
          content: `You are an AV equipment sales assistant. Analyze purchase orders and suggest highly relevant complementary products for professional AV installations.

Product Catalog (CSV format):
${productCatalog}

Guidelines:
- Only suggest products that are genuinely complementary to their purchase
- Keep suggestions to 2-3 most relevant items
- Include brief explanation of why each item is recommended
- Be professional and helpful, not pushy
- Sign emails as "Best regards, The New York Marketing Team"`,
        },
        {
          role: "user",
          content: `Purchase Order Subject: ${subject}\n\nPurchase Order:\n${emailBody}`,
        },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI upsell generation error:", error);
    return null;
  }
}

export async function classifyEmailType(
  emailBody: string,
  subject: string
): Promise<"product_inquiry" | "purchase_order" | "other"> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini-2025-04-14",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Classify the email into one of three categories. ONLY respond to emails that are specifically about AV (Audio/Video) equipment sales, products, or services.

1. "product_inquiry" - Customer is asking about AV equipment products, pricing, availability, quotes, specifications, recommendations, installation, or technical support for AV equipment. Must be specifically about AV products/services.

2. "purchase_order" - Customer is placing an order for AV equipment, includes PO numbers, "please ship", "we'll take", quantity commitments, delivery requests, final purchase decisions for AV products.

3. "other" - ANY email that is NOT specifically about AV equipment, including: thank you messages, shipping status, complaints, general business questions, personal emails, spam, emails about other industries/products, or anything unrelated to AV sales.

IMPORTANT: If the email is about anything other than AV equipment sales, products, or services, classify as "other". Do not respond to non-AV related emails.

Respond with JSON: {"emailType": "product_inquiry" | "purchase_order" | "other"}`,
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
      return "other";
    }

    const result = JSON.parse(content);
    const emailType = result.emailType;

    if (
      emailType === "product_inquiry" ||
      emailType === "purchase_order" ||
      emailType === "other"
    ) {
      return emailType;
    }

    console.error("Invalid email type returned:", emailType);
    return "other";
  } catch (error) {
    console.error("AI email classification error:", error);
    return "other";
  }
}
