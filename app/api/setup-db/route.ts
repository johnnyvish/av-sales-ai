import { setupDatabase } from "@/lib/db";
import {
  searchProducts,
  searchProductsByBrand,
  searchProductsByCategory,
  searchProductsByPriceRange,
  advancedSearch,
} from "@/lib/search";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await setupDatabase();

    // Test search functionality
    console.log("Testing search functionality...");

    // Test 1: Basic search for EPSON products
    const epsonResults = await searchProducts("EPSON", 3);
    console.log(`Found ${epsonResults.length} EPSON products`);

    // Test 2: Brand search for EPSON
    const brandResults = await searchProductsByBrand("EPSON", 3);
    console.log(`Found ${brandResults.length} EPSON brand products`);

    // Test 3: Category search for projector accessories
    const categoryResults = await searchProductsByCategory(
      "projector",
      "ACCESSORIES",
      3
    );
    console.log(`Found ${categoryResults.length} projector accessories`);

    // Test 4: Price range search for accessories under $100
    const priceResults = await searchProductsByPriceRange(
      0,
      100,
      "ACCESSORIES"
    );
    console.log(`Found ${priceResults.length} accessories under $100`);

    // Test 5: Advanced search for cases in accessories $20-$100
    const advancedResults = await advancedSearch({
      query: "case",
      category: "ACCESSORIES",
      minPrice: 20,
      maxPrice: 100,
      limit: 3,
    });
    console.log(
      `Found ${advancedResults.length} cases in accessories $20-$100`
    );

    return NextResponse.json({
      success: true,
      message: "Database tables created successfully",
      searchTest: {
        basicSearch: {
          query: "EPSON",
          results: epsonResults.length,
          sampleProducts: epsonResults.slice(0, 2).map((p) => ({
            name: p.name,
            model: p.model,
            price: p.price,
          })),
        },
        brandSearch: {
          query: "EPSON",
          results: brandResults.length,
          sampleProducts: brandResults.slice(0, 2).map((p) => ({
            name: p.name,
            model: p.model,
            price: p.price,
          })),
        },
        categorySearch: {
          query: "projector",
          category: "ACCESSORIES",
          results: categoryResults.length,
          sampleProducts: categoryResults.slice(0, 2).map((p) => ({
            name: p.name,
            model: p.model,
            price: p.price,
          })),
        },
        priceRangeSearch: {
          minPrice: 0,
          maxPrice: 100,
          category: "ACCESSORIES",
          results: priceResults.length,
          sampleProducts: priceResults.slice(0, 2).map((p) => ({
            name: p.name,
            model: p.model,
            price: p.price,
          })),
        },
        advancedSearch: {
          query: "case",
          category: "ACCESSORIES",
          minPrice: 20,
          maxPrice: 100,
          results: advancedResults.length,
          sampleProducts: advancedResults.slice(0, 2).map((p) => ({
            name: p.name,
            model: p.model,
            price: p.price,
          })),
        },
      },
    });
  } catch (error) {
    console.error("Database setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
