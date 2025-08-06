import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = "vs_689305fcf35c8191a3f7ad8143faf180";

const SYSTEM_INSTRUCTIONS = `# AV Equipment Sales Assistant
You are an expert AV equipment sales assistant for New York Marketing Team. Analyze customer emails and respond using the product catalog in vector storage.

## Email Types & Responses
**Product Inquiry**: Answer questions about anything.
**Purchase Order**: Acknowledge the order AND suggest highly relevant 2-3 complementary products (cases, cables, mounts, accessories, etc). Provide an explanation of each product to the customer.

You must use the product catalog in vector storage to find relevant products.

Search extremely thoroughly to give the highest accuracy response.

Be concise.

- Sign: "Best regards, The New York Marketing Team"`;

export async function generateResponse(
  emailBody: string,
  subject: string
): Promise<string | null> {
  try {
    const response = await openai.responses.create({
      model: "o3-2025-04-16",
      instructions: SYSTEM_INSTRUCTIONS,
      input: `Customer Email Subject: ${subject}\n\nCustomer Email:\n${emailBody}`,
      tools: [
        {
          type: "file_search",
          vector_store_ids: [VECTOR_STORE_ID],
        },
      ],
    });

    return response.output_text;
  } catch (error) {
    console.error("AI response generation error:", error);
    return null;
  }
}

export async function shouldRespondToEmail(
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
          content: `Determine if this email is related to AV equipment (product inquiries, purchase orders, pricing questions, etc.) and requires a response. Respond with JSON: {"shouldRespond": true/false}`,
        },
        {
          role: "user",
          content: `Subject: ${subject}\n\nBody: ${emailBody}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) return false;

    const result = JSON.parse(content);
    return result.shouldRespond || false;
  } catch (error) {
    console.error("Email classification error:", error);
    return false;
  }
}
