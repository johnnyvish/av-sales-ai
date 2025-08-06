import Fuse from "fuse.js";

interface Product {
  name: string;
  model: string;
  category: string;
  price: number;
  description: string;
  [key: string]: unknown;
}

// Import catalog data using dynamic import
let fullCatalog: Product[] = [];

// Initialize catalog data
async function initializeCatalog() {
  if (fullCatalog.length === 0) {
    try {
      const catalogData = await import("../data/av_products.json");
      fullCatalog = catalogData.default as Product[];
    } catch (error) {
      console.error("Failed to load catalog data:", error);
      fullCatalog = [];
    }
  }
  return fullCatalog;
}

// Configure Fuse.js for comprehensive product search
const fuseOptions = {
  // Search across all relevant fields with weighted importance
  keys: [
    { name: "name", weight: 0.4 }, // Product name is most important
    { name: "model", weight: 0.3 }, // Model numbers are very important
    { name: "description", weight: 0.2 }, // Descriptions help with context
    { name: "category", weight: 0.1 }, // Category for broad searches
    { name: "Product Type", weight: 0.05 }, // Additional product classification
    { name: "Class", weight: 0.05 }, // Product class
    { name: "Sub Class", weight: 0.05 }, // Sub classification
    { name: "Product Code", weight: 0.25 }, // Alternative product codes
    // Include any other searchable fields from your JSON
  ],

  // Search configuration
  threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
  distance: 100, // Maximum allowed distance for fuzzy matching
  includeScore: true, // Include search relevance score
  includeMatches: true, // Show which fields matched
  minMatchCharLength: 2, // Minimum characters to trigger a match
  shouldSort: true, // Sort results by relevance

  // Advanced options for better matching
  ignoreLocation: false, // Consider location of match in string
  ignoreFieldNorm: false, // Field length normalization
  fieldNormWeight: 1, // How much field length affects score
};

// Fuse instance will be created dynamically for each search

// Enhanced search function with multiple strategies
async function searchProducts(
  query: string,
  limit: number = 10
): Promise<Product[]> {
  if (!query || query.trim() === "") {
    return [];
  }

  const catalog = await initializeCatalog();
  if (catalog.length === 0) return [];

  const searchTerm = query.trim();

  // Create Fuse instance with current catalog
  const fuse = new Fuse(catalog, fuseOptions);

  // Strategy 1: Use Fuse.js for intelligent fuzzy search
  const fuseResults = fuse.search(searchTerm, { limit: limit * 2 }); // Get more results to filter

  // Strategy 2: Direct field searches for exact matches (higher priority)
  const exactMatches: Product[] = [];
  const searchLower = searchTerm.toLowerCase();

  catalog.forEach((product) => {
    // Exact model number match (highest priority)
    if (
      product.model?.toLowerCase() === searchLower ||
      product["Product Code"]?.toString().toLowerCase() === searchLower
    ) {
      exactMatches.push(product);
    }
    // Exact name match
    else if (product.name?.toLowerCase() === searchLower) {
      exactMatches.push(product);
    }
  });

  // Strategy 3: Combine and deduplicate results
  const combinedResults = new Map<
    string,
    { product: Product; score: number }
  >();

  // Add exact matches with highest score (0)
  exactMatches.forEach((product) => {
    combinedResults.set(product.model, { product, score: 0 });
  });

  // Add Fuse results if not already included
  fuseResults.forEach((result) => {
    const product = result.item;
    const score = result.score || 1;

    if (!combinedResults.has(product.model)) {
      combinedResults.set(product.model, { product, score });
    }
  });

  // Strategy 4: Sort by relevance and return
  const sortedResults = Array.from(combinedResults.values())
    .sort((a, b) => a.score - b.score) // Lower score = better match
    .slice(0, limit)
    .map((result) => result.product);

  return sortedResults;
}

// Advanced search with category filtering
async function searchProductsByCategory(
  query: string,
  category: string,
  limit: number = 10
): Promise<Product[]> {
  const catalog = await initializeCatalog();
  if (catalog.length === 0) return [];

  const categoryFiltered = catalog.filter(
    (product) =>
      product.category?.toLowerCase().includes(category.toLowerCase()) ||
      product["Product Type"]
        ?.toString()
        .toLowerCase()
        .includes(category.toLowerCase()) ||
      product["Class"]
        ?.toString()
        .toLowerCase()
        .includes(category.toLowerCase())
  );

  const categoryFuse = new Fuse(categoryFiltered, fuseOptions);
  const results = categoryFuse.search(query, { limit });

  return results.map((result) => result.item);
}

// Price range search
async function searchProductsByPriceRange(
  minPrice: number,
  maxPrice: number,
  category?: string
): Promise<Product[]> {
  const catalog = await initializeCatalog();
  if (catalog.length === 0) return [];

  let filtered = catalog.filter((product) => {
    const price =
      typeof product.price === "number"
        ? product.price
        : parseFloat(String(product.price || "0"));
    return price >= minPrice && price <= maxPrice;
  });

  if (category) {
    filtered = filtered.filter((product) =>
      product.category?.toLowerCase().includes(category.toLowerCase())
    );
  }

  return filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
}

// Brand-specific search
async function searchProductsByBrand(
  brandQuery: string,
  limit: number = 20
): Promise<Product[]> {
  const catalog = await initializeCatalog();
  if (catalog.length === 0) return [];

  const brandResults = catalog.filter(
    (product) =>
      product.name?.toLowerCase().includes(brandQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(brandQuery.toLowerCase())
  );

  return brandResults.slice(0, limit);
}

// Multi-field search for complex queries
async function advancedSearch(params: {
  query?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}): Promise<Product[]> {
  const catalog = await initializeCatalog();
  if (catalog.length === 0) return [];

  let results = catalog;

  // Filter by category if specified
  if (params.category) {
    results = results.filter(
      (product) =>
        product.category
          ?.toLowerCase()
          .includes(params.category!.toLowerCase()) ||
        product["Product Type"]
          ?.toString()
          .toLowerCase()
          .includes(params.category!.toLowerCase())
    );
  }

  // Filter by brand if specified
  if (params.brand) {
    results = results.filter(
      (product) =>
        product.name?.toLowerCase().includes(params.brand!.toLowerCase()) ||
        product.description?.toLowerCase().includes(params.brand!.toLowerCase())
    );
  }

  // Filter by price range if specified
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    results = results.filter((product) => {
      const price =
        typeof product.price === "number"
          ? product.price
          : parseFloat(String(product.price || "0"));
      if (params.minPrice !== undefined && price < params.minPrice)
        return false;
      if (params.maxPrice !== undefined && price > params.maxPrice)
        return false;
      return true;
    });
  }

  // Apply text search if query specified
  if (params.query) {
    const filteredFuse = new Fuse(results, fuseOptions);
    const searchResults = filteredFuse.search(params.query, {
      limit: params.limit || 10,
    });
    return searchResults.map((result) => result.item);
  }

  return results.slice(0, params.limit || 10);
}

// Export all search functions
export {
  searchProducts,
  searchProductsByCategory,
  searchProductsByPriceRange,
  searchProductsByBrand,
  advancedSearch,
};
