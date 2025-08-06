import OpenAI from "openai";
import {
  searchProducts,
  searchProductsByCategory,
  searchProductsByPriceRange,
  searchProductsByBrand,
  advancedSearch,
} from "./search";

interface Product {
  name: string;
  model: string;
  category: string;
  price: number;
  description: string;
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
  subject: string
): Promise<SearchResult> {
  const allFoundProducts = new Map<string, Product>();
  const searchQueries: string[] = [];
  const searchStrategies: string[] = [];
  let iterations = 0;
  const maxIterations = 12;

  try {
    while (iterations < maxIterations) {
      iterations++;

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini-2025-04-14",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an advanced product search agent with a critical mission: gather as much relevant product data as possible to enable a smarter LLM to respond to customer emails with maximum accuracy and completeness.

Your primary goal is to collect comprehensive, relevant product information that will allow the final AI response to be highly accurate, detailed, and helpful.

Available search strategies:
1. "basic" - General text search across all product fields
2. "category" - Search within specific product categories  
3. "brand" - Brand-specific search
4. "price_range" - Search by price range
5. "advanced" - Multi-parameter search with filters
6. "complementary" - Find accessories/items that complement already found products

Your task: Choose ONE strategy and provide the parameters for that search.

Consider:
- Exact model numbers, brands, categories mentioned
- Use cases (education, corporate, installation, etc.)
- Price constraints or budget mentions
- Accessories that complement main products found
- Product relationships (projector → cases, mounts, cables)
- Alternative products that might meet their needs
- Related products that could enhance their setup
- Products mentioned in similar contexts

Current iteration: ${iterations}/${maxIterations}
Products found so far: ${allFoundProducts.size}
${
  searchQueries.length > 0
    ? `Previous searches: ${searchQueries.join(", ")}`
    : ""
}
${
  searchStrategies.length > 0
    ? `Strategies used: ${searchStrategies.join(", ")}`
    : ""
}

CRITICAL OBJECTIVES:
- Gather comprehensive product data to enable highly accurate AI responses
- Find ALL relevant products, not just the most obvious ones
- Consider edge cases, alternatives, and complementary items
- Think about what information the final AI will need to provide a complete response
- Don't repeat the same search parameters
- Consider what products we already found and what additional data would be valuable
- Prioritize breadth and completeness over speed - accuracy depends on having all relevant data

Respond with JSON based on chosen strategy:

For "basic" strategy:
{
  "strategy": "basic",
  "searchQuery": "search terms",
  "reasoning": "why this query",
  "isDone": boolean
}

For "category" strategy:
{
  "strategy": "category", 
  "searchQuery": "search terms",
  "category": "category name",
  "reasoning": "why this category search",
  "isDone": boolean
}

For "brand" strategy:
{
  "strategy": "brand",
  "brandQuery": "brand name", 
  "reasoning": "why this brand",
  "isDone": boolean
}

For "price_range" strategy:
{
  "strategy": "price_range",
  "minPrice": number,
  "maxPrice": number,
  "category": "optional category filter",
  "reasoning": "why this price range",
  "isDone": boolean
}

For "advanced" strategy:
{
  "strategy": "advanced",
  "query": "optional text query",
  "category": "optional category",
  "brand": "optional brand",
  "minPrice": "optional min price",
  "maxPrice": "optional max price",
  "reasoning": "why these specific filters",
  "isDone": boolean
}

For "complementary" strategy:
{
  "strategy": "complementary",
  "searchQuery": "accessories or complementary items",
  "reasoning": "why these complement existing products",
  "isDone": boolean
}`,
          },
          {
            role: "user",
            content: `Customer Email Subject: ${subject}\n\nCustomer Email:\n${emailBody}

${
  allFoundProducts.size > 0
    ? `\nProducts already found:\n${Array.from(allFoundProducts.values())
        .slice(0, 5)
        .map((p) => `- ${p.name} (${p.model})`)
        .join("\n")}${
        allFoundProducts.size > 5
          ? `\n... and ${allFoundProducts.size - 5} more`
          : ""
      }`
    : ""
}`,
          },
        ],
      });

      const content = response.choices[0].message.content;
      if (!content) break;

      const result = JSON.parse(content);
      let products: Product[] = [];
      let searchDescription = "";

      // Execute search based on chosen strategy
      switch (result.strategy) {
        case "basic":
          if (
            result.searchQuery &&
            !searchQueries.includes(result.searchQuery)
          ) {
            searchQueries.push(result.searchQuery);
            searchStrategies.push("basic");
            products = await searchProducts(result.searchQuery, 12);
            searchDescription = `Basic search: "${result.searchQuery}"`;
          }
          break;

        case "category":
          const categoryQuery = `${result.searchQuery} in ${result.category}`;
          if (!searchQueries.includes(categoryQuery)) {
            searchQueries.push(categoryQuery);
            searchStrategies.push("category");
            products = await searchProductsByCategory(
              result.searchQuery,
              result.category,
              12
            );
            searchDescription = `Category search: "${result.searchQuery}" in ${result.category}`;
          }
          break;

        case "brand":
          if (
            result.brandQuery &&
            !searchQueries.includes(`brand:${result.brandQuery}`)
          ) {
            searchQueries.push(`brand:${result.brandQuery}`);
            searchStrategies.push("brand");
            products = await searchProductsByBrand(result.brandQuery, 15);
            searchDescription = `Brand search: ${result.brandQuery}`;
          }
          break;

        case "price_range":
          const priceQuery = `price:${result.minPrice}-${result.maxPrice}${
            result.category ? ` category:${result.category}` : ""
          }`;
          if (!searchQueries.includes(priceQuery)) {
            searchQueries.push(priceQuery);
            searchStrategies.push("price_range");
            products = await searchProductsByPriceRange(
              result.minPrice,
              result.maxPrice,
              result.category
            );
            searchDescription = `Price range: $${result.minPrice}-$${
              result.maxPrice
            }${result.category ? ` in ${result.category}` : ""}`;
          }
          break;

        case "advanced":
          const advancedQuery = `advanced:${JSON.stringify({
            query: result.query,
            category: result.category,
            brand: result.brand,
            minPrice: result.minPrice,
            maxPrice: result.maxPrice,
          })}`;
          if (!searchQueries.includes(advancedQuery)) {
            searchQueries.push(advancedQuery);
            searchStrategies.push("advanced");
            products = await advancedSearch({
              query: result.query,
              category: result.category,
              brand: result.brand,
              minPrice: result.minPrice,
              maxPrice: result.maxPrice,
              limit: 12,
            });
            searchDescription = `Advanced search with multiple filters`;
          }
          break;

        case "complementary":
          if (
            result.searchQuery &&
            !searchQueries.includes(`comp:${result.searchQuery}`)
          ) {
            searchQueries.push(`comp:${result.searchQuery}`);
            searchStrategies.push("complementary");
            products = await searchProducts(result.searchQuery, 10);
            searchDescription = `Complementary search: "${result.searchQuery}"`;
          }
          break;

        default:
          console.log(`Unknown strategy: ${result.strategy}`);
          break;
      }

      // Add found products to our collection (Map prevents duplicates by model)
      if (products.length > 0) {
        console.log(`${searchDescription} found ${products.length} products`);
        products.forEach((product) => {
          allFoundProducts.set(product.model, product);
        });
      }

      // Enhanced stopping criteria - prioritize comprehensive data gathering
      const shouldStop =
        result.isDone ||
        allFoundProducts.size >= 40 || // Increased from 25 to allow more comprehensive data
        (iterations >= 8 && allFoundProducts.size >= 20) || // Increased iterations and threshold
        (iterations >= 6 && products.length === 0); // Stop if no new products found after 6 iterations

      if (shouldStop) {
        console.log(
          `Search agent stopping: isDone=${result.isDone}, products=${allFoundProducts.size}, iterations=${iterations}`
        );
        break;
      }
    }
  } catch (error) {
    console.error("Search agent error:", error);
  }

  console.log(
    `Search agent completed: ${
      allFoundProducts.size
    } unique products found using strategies: ${[
      ...new Set(searchStrategies),
    ].join(", ")} - Comprehensive data gathered for accurate AI response`
  );

  return {
    products: Array.from(allFoundProducts.values()),
    searchQueries,
    totalFound: allFoundProducts.size,
  };
}

// Modified: Now uses search agent results
export async function generateEmailResponse(
  emailBody: string,
  subject: string
): Promise<string | null> {
  try {
    // First, let search agent gather relevant products
    const searchResult = await searchAgentGatherProducts(emailBody, subject);

    console.log(
      `Search agent found ${
        searchResult.totalFound
      } products with queries: ${searchResult.searchQueries.join(", ")}`
    );

    // Now use o3 (or your preferred smart model) for final response
    const response = await openai.chat.completions.create({
      model: "o3-2025-04-16", // Using o3 for the smart response
      messages: [
        {
          role: "system",
          content: `You are an expert AV equipment sales assistant. You have been provided with a curated selection of relevant products from our catalog based on the customer's inquiry.

Product Catalog (Pre-filtered and relevant):
${JSON.stringify(searchResult.products, null, 2)}

Respond to the customer's inquiry in a helpful and professional email. Sign emails as "Best regards, The New York Marketing Team"

Search context: Found ${
            searchResult.totalFound
          } relevant products using queries: ${searchResult.searchQueries.join(
            ", "
          )}`,
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

// Modified: Now uses search agent for upsells
export async function generateUpsellResponse(
  emailBody: string,
  subject: string
): Promise<string | null> {
  try {
    // Search for products related to their purchase + complementary items
    const searchResult = await searchAgentGatherProducts(emailBody, subject);

    console.log(`Upsell search found ${searchResult.totalFound} products`);

    const response = await openai.chat.completions.create({
      model: "o3-2025-04-16",
      messages: [
        {
          role: "system",
          content: `You are an expert AV equipment sales assistant specializing in complementary product recommendations.

Relevant Products (Pre-filtered based on their purchase):
${JSON.stringify(searchResult.products, null, 2)}

Guidelines:
- Analyze their purchase and suggest 2-3 genuinely complementary products
- Focus on items that complete their setup or solve common problems
- Include brief explanation of why each item is recommended
- Be helpful, not pushy - focus on value
- Include pricing and model numbers
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
