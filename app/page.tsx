"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  MessageCircle,
  Plus,
  X,
  Zap,
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
  Package,
} from "lucide-react";
import productsData from "./products.json";

interface Product {
  sku: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  dealer_price: number;
  msrp: number;
  status: string;
  reason?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const AVDealerPortal = () => {
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [showSelectedPanel, setShowSelectedPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Load products from JSON file
  useEffect(() => {
    setProducts(productsData);
  }, []);

  // Get unique brands and categories for filters
  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand))].sort(),
    [products]
  );
  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category))].sort(),
    [products]
  );

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesSearch =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBrand =
        selectedBrands.size === 0 || selectedBrands.has(product.brand);
      const matchesCategory =
        selectedCategories.size === 0 ||
        selectedCategories.has(product.category);

      return (
        matchesSearch &&
        matchesBrand &&
        matchesCategory &&
        product.status === "active"
      );
    });

    return filtered.slice(0, 50); // Limit results for performance
  }, [products, searchQuery, selectedBrands, selectedCategories]);

  // AI-powered recommendations
  const generateRecommendations = async (selectedItems: Product[]) => {
    if (selectedItems.length === 0) {
      setRecommendations([]);
      return;
    }

    setIsLoadingRecommendations(true);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedItems,
          products,
        }),
      });

      const data = await response.json();
      const recommendedProducts = data.recommendations
        .map((rec: { sku: string; reason: string }) => {
          const product = products.find((p) => p.sku === rec.sku);
          return product ? { ...product, reason: rec.reason } : null;
        })
        .filter(Boolean);

      setRecommendations(recommendedProducts);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      setRecommendations([]);
    }
    setIsLoadingRecommendations(false);
  };

  // Handle chat with AI
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsLoadingChat(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: chatInput,
          products,
          chatHistory: chatMessages,
        }),
      });

      const data = await response.json();
      const aiResponse: ChatMessage = {
        role: "assistant",
        content: data.response,
      };
      setChatMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error in chat:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    }
    setIsLoadingChat(false);
  };

  // Add product to selection
  const addProduct = (product: Product) => {
    if (!selectedProducts.find((p) => p.sku === product.sku)) {
      const newSelection = [...selectedProducts, product];
      setSelectedProducts(newSelection);
      generateRecommendations(newSelection);
    }
  };

  // Remove product from selection
  const removeProduct = (sku: string) => {
    const newSelection = selectedProducts.filter((p) => p.sku !== sku);
    setSelectedProducts(newSelection);
    generateRecommendations(newSelection);
  };

  // Toggle filter
  const toggleBrand = (brand: string) => {
    const newBrands = new Set(selectedBrands);
    if (newBrands.has(brand)) {
      newBrands.delete(brand);
    } else {
      newBrands.add(brand);
    }
    setSelectedBrands(newBrands);
  };

  const toggleCategory = (category: string) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setSelectedCategories(newCategories);
  };

  const totalValue = selectedProducts.reduce(
    (sum, p) => sum + p.dealer_price,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-black">
                  AV Dealer Portal
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setShowSelectedPanel(!showSelectedPanel)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  showSelectedPanel
                    ? "bg-black text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md border border-gray-200"
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Selected</span>
                {selectedProducts.length > 0 && (
                  <span className="bg-black text-white text-xs px-2 py-1 rounded-full">
                    {selectedProducts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Controls Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 max-w-4xl">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products, part numbers, or descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-2xl shadow-sm focus:ring-2 focus:ring-gray-400 focus:border-gray-400 focus:outline-none transition-all duration-200 text-lg placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-6">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                  showFilters ||
                  selectedBrands.size > 0 ||
                  selectedCategories.size > 0
                    ? "bg-black text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md"
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span>Filters</span>
                {(selectedBrands.size > 0 || selectedCategories.size > 0) && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {selectedBrands.size + selectedCategories.size}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Filters Row */}
          {showFilters && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <SlidersHorizontal className="w-5 h-5 mr-2 text-black" />
                  Filter Products
                </h3>
                {(selectedBrands.size > 0 || selectedCategories.size > 0) && (
                  <button
                    onClick={() => {
                      setSelectedBrands(new Set());
                      setSelectedCategories(new Set());
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Brands */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Brands ({brands.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {brands.map((brand) => (
                      <label
                        key={brand}
                        className="flex items-center group cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.has(brand)}
                          onChange={() => toggleBrand(brand)}
                          className="h-4 w-4 text-black rounded border-gray-300 focus:ring-black"
                        />
                        <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                          {brand}
                          <span className="text-gray-400 ml-1">
                            ({products.filter((p) => p.brand === brand).length})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Categories ({categories.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {categories.map((category) => (
                      <label
                        key={category}
                        className="flex items-center group cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(category)}
                          onChange={() => toggleCategory(category)}
                          className="h-4 w-4 text-black rounded border-gray-300 focus:ring-black"
                        />
                        <span className="ml-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                          {category}
                          <span className="text-gray-400 ml-1">
                            (
                            {
                              products.filter((p) => p.category === category)
                                .length
                            }
                            )
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Full Width Products */}
        <div className="relative">
          {/* Products Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-black" />
                  Products
                </h2>
                <span className="bg-black text-white text-sm font-medium px-3 py-1 rounded-full">
                  {filteredProducts.length} items
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">
                      Part Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-48">
                      Product Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                      Dealer Price
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">
                      MSRP
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.sku}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {product.sku}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-full max-w-sm">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {product.name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium text-black">
                              {product.brand}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {product.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-black">
                          ${product.dealer_price.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          ${product.msrp.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => addProduct(product)}
                          disabled={
                            !!selectedProducts.find(
                              (p) => p.sku === product.sku
                            )
                          }
                          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Products Panel - Overlay */}
          {showSelectedPanel && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] flex justify-end">
              <div className="w-96 h-full bg-white shadow-2xl flex flex-col">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <ShoppingCart className="w-5 h-5 mr-2 text-green-600" />
                      Selected Products
                    </h3>
                    <button
                      onClick={() => setShowSelectedPanel(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-3">
                    {selectedProducts.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">
                          No products selected
                        </p>
                        <p className="text-sm">
                          Add products from the table to get started
                        </p>
                      </div>
                    ) : (
                      selectedProducts.map((product) => (
                        <div
                          key={product.sku}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {product.sku}
                            </div>
                            <div className="text-sm text-gray-600 truncate">
                              {product.name}
                            </div>
                            <div className="text-lg font-bold text-black">
                              ${product.dealer_price.toLocaleString()}
                            </div>
                          </div>
                          <button
                            onClick={() => removeProduct(product.sku)}
                            className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* AI Recommendations */}
                  {(recommendations.length > 0 || isLoadingRecommendations) && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-3">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          Smart Recommendations
                        </h4>
                      </div>

                      {isLoadingRecommendations ? (
                        <div className="text-center py-8">
                          <div className="inline-flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent"></div>
                            <span className="text-sm text-gray-600">
                              Finding recommendations...
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recommendations.map((product) => (
                            <div
                              key={product.sku}
                              className="p-4 border border-gray-200 rounded-xl bg-gray-50 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">
                                    {product.sku}
                                  </div>
                                  <div className="text-lg font-bold text-black">
                                    ${product.dealer_price.toLocaleString()}
                                  </div>
                                </div>
                                <button
                                  onClick={() => addProduct(product)}
                                  className="ml-3 bg-black text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="text-xs text-gray-600 bg-white/50 p-2 rounded-lg">
                                {product.reason}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedProducts.length > 0 && (
                  <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">
                        Total:
                      </span>
                      <span className="text-2xl font-bold text-black">
                        ${totalValue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {showChat && (
          <div className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-2xl shadow-xl w-96 sm:w-[28rem] h-[32rem] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-black text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <h3 className="font-semibold">Product Assistant</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setChatMessages([])}
                  disabled={chatMessages.length === 0}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Clear chat"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <MessageCircle className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm">Start a conversation about products</p>
                </div>
              )}
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      message.role === "user"
                        ? "bg-black text-white"
                        : "bg-white border border-gray-200 text-gray-900 shadow-sm"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoadingChat && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="animate-bounce w-2 h-2 bg-gray-400 rounded-full"></div>
                      <div
                        className="animate-bounce w-2 h-2 bg-gray-400 rounded-full"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="animate-bounce w-2 h-2 bg-gray-400 rounded-full"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleChatSubmit()}
                  placeholder="Ask about products..."
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isLoadingChat}
                  className="bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowChat(!showChat)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 rounded-full shadow-xl hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default AVDealerPortal;
