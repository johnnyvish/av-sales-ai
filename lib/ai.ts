import OpenAI from "openai";
import { searchProducts } from "./search";

interface Product {
  name?: string;
  model?: string;
  brand?: string;
  category?: string;
  description?: string;
  price?: number;
  msrp?: number;
  partNumber?: string;
  upc?: string | number;
  class?: string;
  subClass?: string;
  [key: string]: unknown;
}

interface SearchResult {
  products: Product[];
  searchQueries: string[];
  totalFound: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function searchAgentGatherProducts(
  emailBody: string,
  subject: string,
  mode: "inquiry" | "upsell" = "inquiry"
): Promise<SearchResult> {
  const allFoundProducts = new Map<string, Product>();
  const searchQueries: string[] = [];
  const maxIterations = 15;
  let iterations = 0;

  try {
    while (iterations < maxIterations) {
      iterations++;

      const response = await openai.responses.create({
        model: "gpt-4.1-2025-04-14",
        instructions: `
You are an advanced product search agent for AV equipment.

SEARCH IS SIMPLE:
- Just type what you're looking for: "AVPro matrix switch 8x8"  
- Add specific terms: "RTI touchpanel wireless"
- Include model codes: "AC-MV-41 multiviewer"
- Add constraints: "hdmi extender under 500 dollars"

The search is fuzzy and will find relevant stuff.

AVAILABLE_CATEGORIES: accessories, audio, compact amplifier, distribution amp,
distributed audio amplifier, hdbaset extender set, hardware, hdmi cables,
matrix switch, mxnet 1g, mxnet 10g, remote controls, touchpanels and keypads,
usb cables, vyper, …         (trimmed list)

COMMON_BRANDS: AVPro Edge, RTI, BulletTrain, AudioControl, Pro Control, Murideo ...

EXAMPLE SEARCH QUERIES
• "AC-MV-41 multiviewer"                → AVPro Edge 4-in/1-out multiviewer
• "AVPro Edge matrix switch 8x8"        → brand + product type
• "hdmi cables 15m under 250"           → long-run cables under $250
• "RTI accessories"                     → RTI accessories
• "AC-CXWP-LPU-T wall plate"            → ConferX USB-C wall-plate transmitter
• "HDBaseT extender 70m"                → long-distance extenders
• "matrix switch over 10000"            → high-budget matrix switchers
• "mxnet 1g dante encoder"              → MXnet Evolution II Dante encoders
• "AudioControl networked audio"        → AudioControl eARC/Dante devices

The search is fuzzy and will find relevant stuff based on any terms you include.

SEARCH MODE: ${mode}
${
  mode === "upsell"
    ? `
UPSELL MODE - Search for COMPLEMENTARY products, not what they already mentioned:
- Focus on products that COMPLETE their setup or solve RELATED problems
- Don't repeat their exact products - find what goes WITH their purchase
`
    : `
INQUIRY MODE - Search for products matching their specific requests and questions.
`
}

PRICE LANDSCAPE
• Products range from $4 to $17 000 (median ≈$475).

You will iteratively propose a search query, explain your reasoning, predict
completion, and grade your confidence (1-10).

Respond only in JSON:
{ "searchQuery": "...", "reasoning": "...", "isDone": false, "confidence": 7 }

Your vector store is available to you as well, which includes the entire product catalog. Don't be afraid to use it.
`,
        tools: [
          {
            type: "file_search",
            vector_store_ids: ["vs_689305fcf35c8191a3f7ad8143faf180"],
          },
        ],
        input: `

Current iteration: ${iterations}/${maxIterations}
Products found so far: ${allFoundProducts.size}
${
  searchQueries.length > 0
    ? `Previous searches: ${searchQueries.slice(-3).join(", ")}`
    : ""
}

Customer Email Subject: ${subject}

Customer Email:
${emailBody}

Recent searches: ${searchQueries.slice(-5).join(", ") || "None yet"}

Products already found (${allFoundProducts.size} total):
${
  allFoundProducts.size > 0
    ? Array.from(allFoundProducts.values())
        .slice(0, 8)
        .map(
          (p) =>
            `- ${p.name || p.model} ${p.brand ? `(${p.brand})` : ""} ${
              p.price ? `$${p.price}` : ""
            }`
        )
        .join("\n") +
      (allFoundProducts.size > 8
        ? `\n... and ${allFoundProducts.size - 8} more`
        : "")
    : "None yet - start searching!"
}
        `,
      });

      const content = response.output_text;
      if (!content) break;

      const result = JSON.parse(content);

      // Execute the search with proper parameters
      const searchQuery = result.searchQuery?.trim();
      if (!searchQuery) {
        console.log("No search query provided, stopping");
        break;
      }

      // Avoid duplicate searches
      if (searchQueries.includes(searchQuery)) {
        console.log(`Duplicate search avoided: "${searchQuery}"`);
        continue;
      }

      searchQueries.push(searchQuery);

      try {
        // Use the search function with proper limit parameter
        const products = await searchProducts(searchQuery, { limit: 20 });

        console.log(
          `Search: "${searchQuery}" found ${products.length} products`
        );

        // Add found products to our collection
        if (products.length > 0) {
          products.forEach((result) => {
            const product = result.product;
            const key =
              product.model ||
              product.partNumber ||
              product.name ||
              `product_${Date.now()}_${Math.random()}`;
            allFoundProducts.set(key, product);
          });
        }

        // Determine if we should continue searching
        const shouldStop =
          result.isDone ||
          allFoundProducts.size >= 50 ||
          (iterations >= 10 && allFoundProducts.size >= 25) ||
          (iterations >= 8 && products.length === 0) ||
          (iterations >= 5 &&
            allFoundProducts.size >= 15 &&
            products.length < 3);

        if (shouldStop) {
          console.log(
            `Search agent stopping: isDone=${result.isDone}, confidence=${result.confidence}, products=${allFoundProducts.size}, iterations=${iterations}`
          );
          break;
        }
      } catch (searchError) {
        console.error(`Search error for query "${searchQuery}":`, searchError);
        continue;
      }
    }
  } catch (error) {
    console.error("Search agent error:", error);
  }

  const uniqueProducts = Array.from(allFoundProducts.values());

  console.log(
    `Search agent completed: ${uniqueProducts.length} unique products found using ${searchQueries.length} queries`
  );

  return {
    products: uniqueProducts,
    searchQueries,
    totalFound: uniqueProducts.length,
  };
}

export async function generateResponse(
  emailBody: string,
  subject: string
): Promise<string | null> {
  try {
    // First, let search agent gather relevant products
    const searchResult = await searchAgentGatherProducts(emailBody, subject);

    console.log(
      `Search agent found ${searchResult.totalFound} products with ${searchResult.searchQueries.length} queries`
    );

    if (searchResult.totalFound === 0) {
      console.log(
        "No products found, generating response without product data"
      );
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-2025-04-14",
      instructions: `          
You are an expert AV equipment sales assistant. Respond professionally to customer inquiries about audio/video equipment.

${
  searchResult.totalFound > 0
    ? `
RELEVANT PRODUCTS FROM SEARCH AGENT:
${JSON.stringify(searchResult.products.slice(0, 30), null, 2)}
`
    : `
No specific products found by search agent for this inquiry. Use your vector store access to find relevant products.
`
}

You also have access to the complete product catalog through your vector store. Use it to find additional relevant products that match the customer's inquiry.

Make your response short and concise.
Don't recommend other products to upsell.

- Sign as "Best regards, The New York Marketing Team"
`,
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_689305fcf35c8191a3f7ad8143faf180"],
        },
      ],
      input: `Customer Email Subject: ${subject}

Customer Email:
${emailBody}`,
    });

    return response.output_text;
  } catch (error) {
    console.error("AI response generation error:", error);
    return null;
  }
}

export async function generateUpsellResponse(
  emailBody: string,
  subject: string
): Promise<string | null> {
  try {
    const searchResult = await searchAgentGatherProducts(
      emailBody,
      subject,
      "upsell"
    );

    console.log(`Upsell search found ${searchResult.totalFound} products`);

    const response = await openai.responses.create({
      model: "o3-2025-04-16",
      instructions: `You are an expert AV equipment sales assistant specializing in complementary product recommendations and upsells.

${
  searchResult.totalFound > 0
    ? `
AVAILABLE PRODUCTS FROM SEARCH AGENT:
${JSON.stringify(searchResult.products.slice(0, 25), null, 2)}

Products found by search agent: ${searchResult.totalFound}
`
    : "Limited product data from search agent - use your vector store access to find complementary products."
}

You also have access to the complete product catalog through your vector store. Use it to find additional complementary products that would enhance the customer's purchase or solve related problems.

First, acknowledge their purchase order and give them the necessary information.

Then upsell them.

UPSELL GUIDELINES:
- Analyze their purchase/inquiry for complementary needs
- Suggest 2-4 genuinely useful complementary products
- Focus on completing their setup or solving related problems
- Include clear value propositions for each recommendation
- Be helpful, not pushy - focus on customer value
- Explain WHY each product is recommended
- Include pricing and model numbers
- Sign as "Best regards, The New York Marketing Team"`,
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_689305fcf35c8191a3f7ad8143faf180"],
        },
      ],
      input: `Customer Purchase/Inquiry Subject: ${subject}

Customer Email/Order:
${emailBody}`,
    });

    return response.output_text;
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
          content: `
Classify AV equipment sales emails into three categories:

1. "product_inquiry" - Questions about products, pricing, recommendations, specs
2. "purchase_order" - Ready to buy, contains PO numbers, quantities, payment info
3. "other" - Everything else (non-AV topics)

Respond with JSON: {"emailType": "product_inquiry" | "purchase_order" | "other", "confidence": 1-10, "reasoning": "brief explanation"}`,
        },
        {
          role: "user",
          content: `Email Subject: ${subject}

Email Body:
${emailBody}`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error("No content in classification response");
      return "other";
    }

    const result = JSON.parse(content);
    const emailType = result.emailType;

    console.log(
      `Email classified as: ${emailType} (confidence: ${result.confidence}) - ${result.reasoning}`
    );

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
