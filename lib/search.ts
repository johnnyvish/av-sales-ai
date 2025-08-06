import Fuse from "fuse.js";

export interface Product {
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

/* ----------------------------------------------
 *  Catalogue loading
 * --------------------------------------------*/
let catalog: Product[] = [];
let fuse: Fuse<Product>;

async function initCatalog() {
  if (catalog.length) return catalog;

  const data = await import("../data/av_products.json");
  catalog = (data.default ?? data) as Product[];

  // build Fuse once
  fuse = new Fuse(catalog, {
    keys: [
      { name: "name", weight: 0.4 },
      { name: "model", weight: 0.35 },
      { name: "partNumber", weight: 0.25 },
      { name: "description", weight: 0.2 },
      { name: "category", weight: 0.1 },
      { name: "brand", weight: 0.1 },
      { name: "class", weight: 0.05 },
      { name: "subClass", weight: 0.05 },
    ],
    threshold: 0.35,
    distance: 100,
    minMatchCharLength: 2,
    includeScore: true,
    includeMatches: true,
    ignoreLocation: true,
  });

  return catalog;
}

/* ----------------------------------------------
 *  Public API
 * --------------------------------------------*/
export async function searchProducts(
  query: string,
  opts: { limit?: number } = {}
) {
  if (!query?.trim()) return [];

  await initCatalog();
  const { limit = 20 } = opts;

  // Just let Fuse handle EVERYTHING
  const results = fuse.search(query, { limit });

  return results.map((result) => ({
    product: result.item,
    score: result.score ?? 1,
  }));
}
