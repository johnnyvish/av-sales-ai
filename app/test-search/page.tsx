"use client";

import { useState } from "react";
// Remove the direct import - we'll use API route instead

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

export default function SearchAgentTest() {
  const [emailBody, setEmailBody] = useState("");
  const [subject, setSubject] = useState("");
  const [mode, setMode] = useState<"inquiry" | "upsell">("inquiry");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!emailBody.trim()) {
      setError("Please enter an email body");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailBody,
          subject,
          mode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Search failed");
      }

      const searchResult = await response.json();
      setResult(searchResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Search Agent Test</h1>

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-2">
            Email Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Looking for HDMI matrix switcher"
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="emailBody" className="block text-sm font-medium mb-2">
            Email Body *
          </label>
          <textarea
            id="emailBody"
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder="Enter the customer email content here..."
            rows={6}
            className="w-full p-3 border border-gray-300 rounded-lg"
          />
        </div>

        <div>
          <label htmlFor="mode" className="block text-sm font-medium mb-2">
            Search Mode
          </label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as "inquiry" | "upsell")}
            className="p-3 border border-gray-300 rounded-lg"
          >
            <option value="inquiry">Inquiry (Find requested products)</option>
            <option value="upsell">Upsell (Find complementary products)</option>
          </select>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Searching..." : "Test Search Agent"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <p className="text-red-700">Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              Search Complete
            </h2>
            <p className="text-green-700">
              Found {result.totalFound} products using{" "}
              {result.searchQueries.length} queries
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Search Queries Used</h3>
            <ul className="list-disc pl-5 space-y-1">
              {result.searchQueries.map((query, index) => (
                <li key={index} className="text-gray-700">
                  {query}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-gray-200 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              Products Found ({result.totalFound})
            </h3>
            {result.products.length === 0 ? (
              <p className="text-gray-600">No products found</p>
            ) : (
              <div className="grid gap-4">
                {result.products.map((product, index) => (
                  <div
                    key={index}
                    className="border border-gray-100 p-3 rounded"
                  >
                    <div className="font-medium">
                      {product.name || product.model || "Unnamed Product"}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {product.brand && <div>Brand: {product.brand}</div>}
                      {product.model && <div>Model: {product.model}</div>}
                      {product.partNumber && (
                        <div>Part #: {product.partNumber}</div>
                      )}
                      {product.category && (
                        <div>Category: {product.category}</div>
                      )}
                      {product.price && <div>Price: ${product.price}</div>}
                      {product.description && (
                        <div className="mt-2">
                          Description: {product.description.substring(0, 200)}
                          {product.description.length > 200 ? "..." : ""}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
