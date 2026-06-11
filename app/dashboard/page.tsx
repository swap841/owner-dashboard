// app/dashboard/page.tsx

"use client";

import React, { useState, useEffect, Component, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/firebaseConfig";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  state = { hasError: false, error: "" };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-8">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-500 mb-4">{this.state.error}</p>
            <button onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition">
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Icons
import {
  ShoppingBag,
  Plus,
  Edit,
  Trash,
  AlertTriangle,
  FolderTree,
  Bike,
  Coins,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
  XCircle,
  Search,
  Download,
  Upload,
  Info,
  Sliders,
  Sparkles,
  Loader2,
  IndianRupee,
  CreditCard,
  Truck,
  Archive,
  BarChart3,
  MessageSquare,
  Star,
} from "lucide-react";

// Components
import Sidebar, { DashboardView } from "@/components/Sidebar";
import DashboardHomeView from "@/components/DashboardHomeView";
import OrderList from "@/components/OrderList";
import ProductForm from "@/components/ProductForm";
import CategoryForm from "@/components/CategoryForm";
import DeliveryBoyForm from "@/components/DeliveryBoyForm";
import RefundModal from "@/components/RefundModal";
import WorkersManager from "@/components/WorkersManager";
import BasketManagementView from "@/components/BasketManagementView";
import BannersManager from "@/components/BannersManager";
import TicketsManager from "@/components/TicketsManager";
import ContactsManager from "@/components/ContactsManager";
import CouponsManager from "@/components/CouponsManager";
import EarningsAnalyticsView from "@/components/EarningsAnalyticsView";
import EmployeeProgressModal from "@/components/EmployeeProgressModal";
import DeliveryPartnerManager from "@/components/DeliveryPartnerManager";
import StoreConfigEditor from "@/components/StoreConfigEditor";
import PolicyEditor from "@/components/PolicyEditor";
import DeliveryZoneManager from "@/components/DeliveryZoneManager";
import APIKeyManager from "@/components/APIKeyManager";
import SetupWizard from "@/components/SetupWizard";
import OutOfRadiusOrders from "@/components/OutOfRadiusOrders";
import PaymentReconciliation from "@/components/PaymentReconciliation";
import CustomerAnalytics from "@/components/CustomerAnalytics";
import FAQManager from "@/components/FAQManager";
import ReviewsViewer from "@/components/ReviewsViewer";

// Hooks
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useOrders } from "@/hooks/useOrders";
import { useDeliveryBoys } from "@/hooks/useDeliveryBoys";
import { useRefunds } from "@/hooks/useRefunds";
import { useAppConfig } from "@/hooks/useAppConfig";
import { saveOwnerDetailsToDB } from "@/src/ownerUtils";

// Types
import { Product, Category, Order, DeliveryBoy, Refund, OrderStatus } from "@/types";
import { exportProductsToCSV } from "@/lib/firestore/products";
import { exportOrdersToCSV, groupOrdersIntoBaskets, DeliveryBasket } from "@/lib/firestore/orders";

const auth = getAuth(app);

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "";

async function clearProductCache() {
  try {
    if (!SERVER_URL) return;
    const { getAuth } = await import("firebase/auth");
    const auth = getAuth();
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch(`${SERVER_URL}/api/clear-cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.warn("Cache clear failed (non-critical):", err);
  }
}

// 1. Create a single stable Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function DashboardContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<DashboardView>("home");

  // Authentication observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        toast.error("Please sign in to access the owner portal.");
        router.push("/");
      } else {
        try {
          const authorized = await saveOwnerDetailsToDB(currentUser);
          if (!authorized) {
            console.warn("[Dashboard] Owner email not in OWNER_EMAILS:", currentUser.email);
          } else {
            console.log("[Dashboard] Owner auth verified:", currentUser.email);
          }
        } catch (err) {
          console.error("[Dashboard] saveOwnerDetailsToDB failed:", err);
        }
        setUser(currentUser);
        queryClient.invalidateQueries();
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  // React Query Hooks
  const {
    products,
    isLoading: prodLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    archiveProduct,
    restoreProduct,
    archivedProducts,
    isArchivedLoading,
    importCSVProducts,
  } = useProducts();

  const {
    categories,
    isLoading: catLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const {
    activeOrders,
    allOrders,
    isActiveOrdersLoading,
    isActiveOrdersRefetching,
    refetchActiveOrders,
    updateOrderStatus,
    dispatchBasket,
    isAllOrdersLoading,
    allOrdersError,
  } = useOrders();

  const {
    deliveryBoys,
    isLoading: boysLoading,
    createDeliveryBoy,
    updateDeliveryBoy,
    deleteDeliveryBoy,
    clearBasketItem,
  } = useDeliveryBoys();

  const {
    refunds,
    isLoading: refundsLoading,
    recordManualRefund,
    processRazorpayRefund,
  } = useRefunds();

  const { config: appConfig } = useAppConfig();

  // Search & Filter state
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Modals state
  const [activeProductModal, setActiveProductModal] = useState<Product | null | "new">(null);
  const [activeCategoryModal, setActiveCategoryModal] = useState<Category | null | "new">(null);
  const [activeDboyModal, setActiveDboyModal] = useState<DeliveryBoy | null | "new">(null);
  const [activeRefundModal, setActiveRefundModal] = useState<Order | null>(null);
  const [progressBoy, setProgressBoy] = useState<DeliveryBoy | null>(null);

  // Auto-refresh control for order list
  const [autoRefreshOrders, setAutoRefreshOrders] = useState(true);

  // 2. CSV Import handler
  const handleCSVImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split("\n");
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        
        // Match columns to expected types
        rows.push({
          name: cols[0] || "",
          price: Number(cols[1]) || 0,
          mrp: Number(cols[2]) || 0,
          stock: Number(cols[3]) || 0,
          weight: Number(cols[4]) || 100,
          unit: cols[5] === "kg" ? "kg" : "g",
          categoryName: cols[6] || "Uncategorized",
          imageUrl: cols[7] || "",
          description: cols[8] || "",
        });
      }

      if (rows.length === 0) {
        return toast.error("No valid product records found in CSV.");
      }

      const toastId = toast.loading(`Importing ${rows.length} products to Firestore...`);
      try {
        const result = await importCSVProducts(rows);
        toast.success(
          `Successfully imported ${result.importedCount} products and verified category denormalized counts!`,
          { id: toastId, duration: 5000 }
        );
        clearProductCache();
      } catch (err: any) {
        toast.error(err.message || "Failed to process bulk import.", { id: toastId });
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset
  };

  // Export CSV handler
  const handleCSVExport = () => {
    const categoryMapping: Record<string, string> = {};
    categories.forEach((c: Category) => {
      if (c.id) categoryMapping[c.id] = c.name;
    });

    const csvContent = exportProductsToCSV(products, categoryMapping);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `grocery_products_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Products catalog exported successfully!");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-zinc-500 font-semibold text-sm">Verifying Owner Session...</span>
      </div>
    );
  }

  // Group categories mapping
  const categoryNamesMap: Record<string, string> = {};
  categories.forEach((c: Category) => {
    if (c.id) categoryNamesMap[c.id] = c.displayName || c.name;
  });

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col md:flex-row">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        ownerName={user?.displayName || user?.email}
      />

      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-x-hidden w-full max-w-7xl mx-auto pt-20 md:pt-8">
        {/* ====================================================================
            🏠 VIEW: Dashboard Home
            ==================================================================== */}
        {currentView === "home" && (
          <DashboardHomeView onNavigate={(view) => setCurrentView(view as DashboardView)} />
        )}

        {/* ====================================================================
            🛍️ VIEW: Products
            ==================================================================== */}
        {currentView === "products" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                  🛍️ Manage Products
                </h1>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Add, update, or import grocery inventory. Low stock products are highlighted in red.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* CSV Import */}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImportChange}
                  className="hidden"
                  id="csv-import-file"
                />
                <label
                  htmlFor="csv-import-file"
                  className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm hover:shadow-md"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Bulk Import (CSV)</span>
                </label>

                {/* CSV Export */}
                <button
                  onClick={handleCSVExport}
                  className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-bold transition shadow-sm hover:shadow-md"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Export Catalog</span>
                </button>

                {/* Add Product */}
                <button
                  onClick={() => setActiveProductModal("new")}
                  className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap gap-2.5 items-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-sm">
              {/* Search text */}
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search products by name..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Category selector filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 text-xs border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none font-semibold text-zinc-700 dark:text-zinc-300"
              >
                <option value="">All Categories</option>
                {categories.map((cat: Category) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName || cat.name}
                  </option>
                ))}
              </select>

              {/* Active / Archived toggle */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border shadow-sm hover:shadow-md ${
                  showArchived
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {showArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Trash className="w-3.5 h-3.5" />}
                <span>{showArchived ? "Archived" : "Active"}</span>
              </button>
            </div>

            {/* Products Grid */}
            {prodLoading || (showArchived && isArchivedLoading) ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-zinc-500 font-semibold text-sm">
                  {showArchived ? "Loading archived products..." : "Loading product catalog..."}
                </span>
              </div>
            ) : showArchived && archivedProducts.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
                <RotateCcw className="w-12 h-12 text-zinc-400 mb-3" />
                <span className="text-zinc-950 dark:text-white font-bold">No archived products</span>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                  Archived products will appear here. Use the Archive button on a product card to move it here.
                </p>
              </div>
            ) : !showArchived && products.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
                <ShoppingBag className="w-12 h-12 text-zinc-400 mb-3" />
                <span className="text-zinc-950 dark:text-white font-bold">Your inventory is empty</span>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                  Import products via bulk CSV or create products individually to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {(showArchived ? archivedProducts : products)
                  .filter((p: Product) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .filter((p: Product) => (selectedCategoryFilter ? p.categoryId === selectedCategoryFilter : true))
                  .map((p: Product) => {
                    const isLowStock = p.stock <= (p.lowStockThreshold || 5);
                    return (
                      <div
                        key={p.id}
                        className={`border bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between group
                        ${
                          showArchived
                            ? "border-amber-200 dark:border-amber-950/60 bg-amber-500/2"
                            : isLowStock
                              ? "border-rose-400 dark:border-rose-950/80 bg-rose-500/2"
                              : "border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                        }`}
                      >
                        {/* Header details & Badge */}
                        <div className="relative aspect-video w-full overflow-hidden bg-zinc-50 border-b border-zinc-100 dark:border-zinc-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.imageUrl || "/images/generic-product-image.png"}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          {showArchived && (
                            <span className="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-lg">
                              <RotateCcw className="w-3 h-3 shrink-0" />
                              Archived
                            </span>
                          )}
                          {!showArchived && isLowStock && (
                            <span className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg flex items-center gap-0.5 shadow-lg">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              Low Stock: {p.stock}
                            </span>
                          )}
                        </div>

                        {/* Title details */}
                        <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 tracking-wide uppercase">
                              {categoryNamesMap[p.categoryId] || "Uncategorized"}
                            </span>
                            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white line-clamp-1 mt-0.5">
                              {p.name}
                            </h3>
                            <p className="text-[10px] text-zinc-400 font-semibold mt-1 line-clamp-2">
                              {p.description || "No description provided."}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-3 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-zinc-400">Price / {p.unit || "pc"}</span>
                              <div className="flex items-center gap-1 font-extrabold text-sm text-zinc-950 dark:text-white">
                                <IndianRupee className="w-3.5 h-3.5 text-zinc-400" />
                                <span>{p.price.toFixed(2)}</span>
                                {p.mrp > p.price && (
                                  <span className="text-[10px] text-zinc-400 font-semibold line-through">
                                    ₹{p.mrp.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {!showArchived && (
                                <button
                                  onClick={() => setActiveProductModal(p)}
                                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 rounded-lg hover:text-emerald-500 hover:bg-emerald-500/5 transition"
                                  title="Edit"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {showArchived ? (
                                <button
                                  onClick={() => {
                                    if (confirm(`Restore ${p.name} to active products?`)) {
                                      restoreProduct(p.id!);
                                      toast.success(`${p.name} restored successfully.`);
                                      clearProductCache();
                                    }
                                  }}
                                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 rounded-lg hover:text-emerald-500 hover:bg-emerald-500/5 transition"
                                  title="Restore"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (confirm(`Archive ${p.name}? It can be restored later from the Archived view.`)) {
                                      archiveProduct(p.id!);
                                      toast.success(`${p.name} archived.`);
                                      clearProductCache();
                                    }
                                  }}
                                  className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-amber-500 rounded-lg hover:text-amber-500 hover:bg-amber-500/5 transition"
                                  title="Archive"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            📁 VIEW: Categories
            ==================================================================== */}
        {currentView === "categories" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 md:p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                  📁 Product Categories
                </h1>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Create, view, or remove categories. Re-syncs product counts automatically.
                </p>
              </div>

              <button
                onClick={() => setActiveCategoryModal("new")}
                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            {catLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-zinc-500 font-semibold text-sm">Loading categories...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
                <FolderTree className="w-12 h-12 text-zinc-400 mb-3" />
                <span className="text-zinc-950 dark:text-white font-bold">No categories exist</span>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                  Create categories first to group products during addition.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((c: Category) => (
                  <div
                    key={c.id}
                    className="border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 rounded-2xl p-4 flex gap-4 items-center justify-between shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-zinc-100 rounded-xl overflow-hidden shrink-0 border border-zinc-200/50 dark:border-zinc-800/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.imageUrl || "/images/generic-category-image.png"}
                          alt={c.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-zinc-900 dark:text-white text-sm">
                          {c.displayName || c.name}
                        </span>
                        {c.displayName && c.displayName !== c.name && (
                          <span className="text-[10px] text-zinc-400">{c.name}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black self-start mt-1 shadow-sm ${c.active ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-300/10 dark:border-zinc-700/10"}`}>
                          {c.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setActiveCategoryModal(c)}
                        className="p-1 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 rounded-lg hover:text-emerald-500 hover:bg-emerald-500/5 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete category ${c.name}? Products in this category will become Uncategorized.`)) {
                            deleteCategory(c.id!);
                            toast.success(`${c.name} deleted.`);
                          }
                        }}
                        className="p-1 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 rounded-lg hover:text-rose-500 hover:bg-rose-500/5 transition"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            📦 VIEW: Orders
            ==================================================================== */}
        {currentView === "orders" && (
          <div className="space-y-6">
            <div className="p-4 md:p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
                <span>📦 Orders Dispatch Center</span>
                {isActiveOrdersRefetching && (
                  <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                )}
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-1">
                Active uncompleted delivery queue. Real-time automatic background syncing.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => {
                    const csv = exportOrdersToCSV(allOrders);
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `orders_export_${Date.now()}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success(`Exported ${allOrders.length} orders to CSV`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition border border-emerald-200 dark:border-emerald-800"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV ({allOrders.length})
                </button>
              </div>
            </div>

            <OrderList
              orders={activeOrders}
              isLoading={isActiveOrdersLoading}
              isRefetching={isActiveOrdersRefetching}
              onRefresh={refetchActiveOrders}
              onUpdateStatus={async (userId: string, orderId: string, status: OrderStatus, extra?: any) => {
                await updateOrderStatus({ userId, orderId, status, extraFields: extra });
              }}
              onOpenRefund={setActiveRefundModal}
              onOpenDispatch={(order: Order) => {
                // Instantly open dispatch baskets tab so they can assign driver
                setCurrentView("dispatchBaskets");
                toast.success("Ready dispatch order opened. Scroll below to see baskets!");
              }}
              onOpenDeliveryPartner={(order: Order) => {
                setCurrentView("deliveryPartner");
                toast.success("Order ready for delivery partner dispatch!");
              }}
              autoRefresh={autoRefreshOrders}
              onToggleAutoRefresh={() => setAutoRefreshOrders(!autoRefreshOrders)}
            />
          </div>
        )}

        {/* ====================================================================
            🛵 VIEW: Delivery Boys
            ==================================================================== */}
        {currentView === "deliveryBoys" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 md:p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                  🛵 Delivery Logistics Fleet
                </h1>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Manage active drivers, track driver status, and view delivery baskets.
                </p>
              </div>

              <button
                onClick={() => setActiveDboyModal("new")}
                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Driver</span>
              </button>
            </div>

            {boysLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-zinc-500 font-semibold text-sm">Synchronizing driver fleet...</span>
              </div>
            ) : deliveryBoys.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
                <Bike className="w-12 h-12 text-zinc-400 mb-3" />
                <span className="text-zinc-950 dark:text-white font-bold">Fleet is empty</span>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                  Add delivery boy profiles to enable dispatch baskets assignment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveryBoys.map((boy: DeliveryBoy) => {
                  const hasBasket = boy.basket && boy.basket.length > 0;
                  return (
                    <div
                      key={boy.id}
                      className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                    >
                      {/* Driver Summary */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                            <Bike className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                              {boy.name}
                            </h3>
                            <p className="text-[10px] text-zinc-400 font-bold">{boy.phone} • {boy.vehicleNumber}</p>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shadow-sm ${
                            boy.active
                              ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border border-emerald-500/10"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-300/10 dark:border-zinc-700/10"
                          }`}
                        >
                          {boy.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Driver Active Basket */}
                      <div className="border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/10 flex-1">
                        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                          Active Shipments Basket ({boy.basket?.length || 0})
                        </h4>
                        {hasBasket ? (
                          <div className="space-y-2 max-h-36 overflow-y-auto">
                            {boy.basket?.map((item: any) => (
                              <div
                                key={item.orderId}
                                className="text-xs bg-white dark:bg-zinc-800 p-2 rounded-lg border border-zinc-150 dark:border-zinc-700 flex justify-between items-center gap-2"
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                    {item.name}
                                  </span>
                                  <span className="text-[9px] text-zinc-400 font-medium truncate max-w-[150px]">
                                    {item.address}
                                  </span>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (confirm("Mark this specific driver item as resolved and remove from driver basket?")) {
                                      await clearBasketItem({ dboyId: boy.id!, orderId: item.orderId });
                                      toast.success("Basket item resolved!");
                                    }
                                  }}
                                  className="text-[9px] font-black text-rose-500 hover:underline shrink-0"
                                >
                                  Resolve
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 font-semibold italic">Basket is currently empty.</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          onClick={() => setActiveDboyModal(boy)}
                          className="px-3 py-1 border border-zinc-200 dark:border-zinc-855 hover:border-emerald-500 rounded-lg text-xs font-bold hover:text-emerald-500 hover:bg-emerald-500/5 transition shadow-sm"
                        >
                          Edit Profile
                        </button>
                        <button
                          onClick={() => setProgressBoy(boy)}
                          className="px-3 py-1 border border-zinc-200 dark:border-zinc-855 hover:border-blue-500 rounded-lg text-xs font-bold hover:text-blue-500 hover:bg-blue-500/5 transition shadow-sm"
                        >
                          <BarChart3 className="w-3 h-3 inline mr-1" /> Progress
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete delivery boy profile for ${boy.name}?`)) {
                              deleteDeliveryBoy(boy.id!);
                              toast.success("Driver deleted.");
                            }
                          }}
                          className="px-3 py-1 border border-zinc-200 dark:border-zinc-855 hover:border-rose-500 rounded-lg text-xs font-bold hover:text-rose-500 hover:bg-rose-500/5 transition shadow-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            🧺 VIEW: Baskets
            ==================================================================== */}
        {currentView === "baskets" && <BasketManagementView />}

        {/* ====================================================================
            👷 VIEW: Workers
            ==================================================================== */}
        {currentView === "workers" && <WorkersManager />}

        {/* ====================================================================
            🏷️ VIEW: Coupons
            ==================================================================== */}
        {currentView === "coupons" && <CouponsManager />}

        {/* ====================================================================
            🖼️ VIEW: Banners
            ==================================================================== */}
        {currentView === "banners" && <BannersManager />}

        {/* ====================================================================
            🎫 VIEW: Tickets
            ==================================================================== */}
        {currentView === "tickets" && <TicketsManager />}

        {/* ====================================================================
            💬 VIEW: Contacts (Support Tickets)
            ==================================================================== */}
        {currentView === "contacts" && <ContactsManager />}

        {/* ====================================================================
            🌐 VIEW: Store Config (Centralized appConfig — branding, features, etc.)
            ==================================================================== */}
        {currentView === "storeConfig" && <StoreConfigEditor />}

        {/* ====================================================================
            🔑 VIEW: API Key Manager
            ==================================================================== */}
        {currentView === "apiKeys" && <APIKeyManager />}

        {/* ====================================================================
            📍 VIEW: Delivery Zones
            ==================================================================== */}
        {currentView === "deliveryZones" && <DeliveryZoneManager />}

        {/* ====================================================================
            🧭 VIEW: Out of Radius Orders
            ==================================================================== */}
        {currentView === "outOfRadiusOrders" && <OutOfRadiusOrders />}

        {/* ====================================================================
            ✨ VIEW: Setup Wizard
            ==================================================================== */}
        {currentView === "setupWizard" && <SetupWizard onComplete={() => setCurrentView("home")} />}

        {/* ====================================================================
            💰 VIEW: Earnings & Analytics
            ==================================================================== */}

        {/* ====================================================================
            🧺 VIEW: Dispatch Baskets (Bin-Packing Algorithmic Auto-Grouping)
            ==================================================================== */}
        {currentView === "dispatchBaskets" && (
          <div className="space-y-6">
            <div className="p-4 md:p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                🧺 Bin-Packed Dispatch Baskets
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-1">
                Our smart engine automatically compiles unassigned "Ready to Dispatch" orders into pincode area baskets respecting a strict 10kg weight capacity limit!
              </p>
            </div>

            {/* Baskets Engine */}
            {prodLoading || isActiveOrdersLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-zinc-500 font-semibold text-sm">Compiling area code weight groups...</span>
              </div>
            ) : (
              (() => {
                const baskets = groupOrdersIntoBaskets(allOrders, (appConfig?.deliverySettings?.radiusKm || 10) * 1000);

                if (baskets.length === 0) {
                  return (
                    <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
                      <ShoppingBag className="w-12 h-12 text-zinc-400 mb-3" />
                      <span className="text-zinc-950 dark:text-white font-bold">No dispatch groups available</span>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                        Baskets form automatically once unassigned orders are updated to "Ready to Dispatch" status.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {baskets.map((basket: DeliveryBasket) => {
                      const totalWeightKg = (basket.totalWeight / 1000).toFixed(2);
                      return (
                        <div
                          key={basket.basketId}
                          className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                          {/* Basket Header */}
                          <div>
                            <div className="flex items-center justify-between">
                              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                                {basket.basketId}
                              </h3>
                              <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 rounded-md">
                                {basket.areaCode}
                              </span>
                            </div>
                            <div className="flex gap-4 mt-2 text-[10px] text-zinc-400 font-bold">
                              <span>Orders: <strong>{basket.orders.length}</strong></span>
                              <span>Weight: <strong className="text-emerald-500">{totalWeightKg} kg / 10 kg max</strong></span>
                              <span>Amount: <strong>₹{basket.totalAmount.toFixed(2)}</strong></span>
                            </div>
                          </div>

                          {/* Basket Orders preview */}
                          <div className="border border-zinc-100 dark:border-zinc-850 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-950/10 space-y-1.5 max-h-36 overflow-y-auto">
                            {basket.orders.map((o: Order) => (
                              <div
                                key={o.id}
                                className="text-xs bg-white dark:bg-zinc-855 p-2 rounded-lg border border-zinc-150 dark:border-zinc-800 flex justify-between items-center"
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{o.address?.name || o.id}</span>
                                  <span className="text-[9px] text-zinc-400 truncate max-w-[200px]">{o.address?.addressLine || ""}</span>
                                </div>
                                <span className="font-extrabold text-[10px] text-zinc-900 dark:text-zinc-100">
                                  {(o.totalWeight / 1000).toFixed(2)} kg
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Dispatch Assign Selection Form */}
                          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex flex-wrap items-center justify-between gap-3">
                            <span className="text-xs font-bold text-zinc-400">Assign Driver</span>
                            <div className="flex gap-2 w-full sm:w-auto flex-1 max-w-[300px]">
                              <select
                                id={`driver-select-${basket.basketId}`}
                                className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold rounded-lg flex-1 focus:outline-none"
                              >
                                <option value="">Select driver</option>
                                {deliveryBoys
                                  .filter((d: DeliveryBoy) => d.active)
                                  .map((dboy: DeliveryBoy) => (
                                    <option key={dboy.id} value={`${dboy.id}|${dboy.name}`}>
                                      {dboy.name} ({dboy.active ? "Active" : "Inactive"})
                                    </option>
                                  ))}
                              </select>
                              <button
                                onClick={async () => {
                                  const selectEl = document.getElementById(
                                    `driver-select-${basket.basketId}`
                                  ) as HTMLSelectElement;
                                  if (!selectEl.value) {
                                    return toast.error("Please select a driver to dispatch.");
                                  }

                                  const [dboyId, dboyName] = selectEl.value.split("|");
                                  const toastId = toast.loading(`Dispatching basket to ${dboyName}...`);

                                  try {
                                    await dispatchBasket({
                                      basket: { orders: basket.orders },
                                      dboyId,
                                      dboyName,
                                    });
                                    toast.success("Dispatch batch successfully assigned and drivers notified!", { id: toastId });
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to complete batch dispatch transaction.", { id: toastId });
                                  }
                                }}
                                className="px-3.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-lg text-xs transition shadow-md hover:shadow-lg"
                              >
                                Dispatch
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ====================================================================
            💰 VIEW: Earnings & Analytics
            ==================================================================== */}
        {currentView === "earnings" && <EarningsAnalyticsView />}

        {/* ====================================================================
            📊 VIEW: Customer Analytics
            ==================================================================== */}
        {currentView === "customerAnalytics" && (
          <CustomerAnalytics
            allOrders={allOrders}
            isLoading={isAllOrdersLoading}
            error={allOrdersError}
          />
        )}

        {/* ====================================================================
            🔁 VIEW: Refunds Management
            ==================================================================== */}
        {currentView === "refunds" && (
          <div className="space-y-6">
            <div className="p-4 md:p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                🔁 Refund Transactions Log
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-1">
                Overview of pending and approved refunds. Full audit reconciliation records.
              </p>
            </div>

            {refundsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-zinc-500 font-semibold text-sm">Synchronizing refund logs...</span>
              </div>
            ) : refunds.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
                <RotateCcw className="w-12 h-12 text-zinc-400 mb-3" />
                <span className="text-zinc-950 dark:text-white font-bold">No refund entries logged</span>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                  Only orders marked as "Delivered" and paid via "RAZORPAY" can be refunded using the gateway. COD orders allow manual log logs.
                </p>
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-bold">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Razorpay Refund ID</th>
                      <th className="p-3">Refund Amount</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-855 font-semibold text-zinc-700 dark:text-zinc-300">
                    {refunds.map((ref: Refund) => (
                      <tr key={ref.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                        <td className="p-3 font-bold text-zinc-900 dark:text-white">
                          {ref.orderId.substring(0, 12)}...
                        </td>
                        <td className="p-3 text-zinc-400 font-medium">{ref.razorpayRefundId || "N/A (Manual)"}</td>
                        <td className="p-3 font-extrabold text-zinc-955 dark:text-white text-sm">
                          ₹{(ref.amount || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-zinc-400 text-[11px]">
                          {ref.createdAt?.seconds
                            ? new Date(ref.createdAt.seconds * 1000).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            💳 VIEW: Razorpay Transactions
            ==================================================================== */}
        {currentView === "payments" && (
          <div className="space-y-6">
            <div className="p-4 md:p-5 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
              <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent flex items-center gap-1.5">
                <CreditCard className="w-6 h-6 text-emerald-500 shrink-0" />
                <span>Razorpay Transactions Log</span>
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-1">
                Reconcile payment captures directly. Trigger rapid order refund overlays instantly.
              </p>
            </div>

            {(() => {
              // Fetch completed orders paid via Razorpay
              const rzpOrders = allOrders.filter((o: Order) => o.payment?.method === "razorpay");

              if (rzpOrders.length === 0) {
                return (
                  <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
                    <CreditCard className="w-12 h-12 text-zinc-400 mb-3" />
                    <span className="text-zinc-950 dark:text-white font-bold">No card transactions logged</span>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                      Transactions populate once customers place orders choosing Razorpay payment methods.
                    </p>
                  </div>
                );
              }

              return (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-bold">
                      <tr>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Razorpay Order ID</th>
                        <th className="p-3">Payment ID</th>
                        <th className="p-3">Captured Amount</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-855 font-semibold text-zinc-700 dark:text-zinc-300">
                      {rzpOrders.map((o: Order) => (
                        <tr key={o.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                          <td className="p-3 font-bold text-zinc-900 dark:text-white">
                            {o.id?.substring(0, 12)}...
                          </td>
                          <td className="p-3 text-zinc-400 font-medium">{o.payment?.razorpayOrderId || "N/A"}</td>
                          <td className="p-3 text-zinc-400 font-medium">{o.payment?.razorpayPaymentId || "N/A"}</td>
                          <td className="p-3 font-extrabold text-zinc-955 dark:text-white text-sm">
                            ₹{o.totalAmount.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shadow-sm
                              ${
                                o.payment?.status === "paid"
                                  ? "bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10"
                                  : "bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-500/10"
                              }`}
                            >
                              {o.payment?.status === "paid" ? "Captured" : "Refunded"}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {o.payment?.status === "paid" && (
                              <button
                                onClick={() => setActiveRefundModal(o)}
                                className="px-2.5 py-1 bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white rounded-lg font-bold text-[10px] transition shadow-sm hover:shadow-md"
                              >
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* ====================================================================
            🚚 VIEW: Delivery Partner (Out-Of-City Radius Dispatcher)
            ==================================================================== */}
        {currentView === "deliveryPartner" && (
          <DeliveryPartnerManager />
        )}

        {/* ====================================================================
            🔄 VIEW: Payment Reconciliation
            ==================================================================== */}
        {currentView === "reconciliation" && <PaymentReconciliation />}

        {/* Policy Pages */}
        {currentView === "policyShipping" && <PolicyEditor policyType="shipping" />}
        {currentView === "policyRefund" && <PolicyEditor policyType="refund" />}
        {currentView === "policyPrivacy" && <PolicyEditor policyType="privacy" />}
        {currentView === "policyTerms" && <PolicyEditor policyType="terms" />}
        {currentView === "policyContact" && <PolicyEditor policyType="contact" />}
        {currentView === "faqManager" && <FAQManager />}
        {currentView === "reviewsViewer" && <ReviewsViewer />}

      </main>

      {/* ====================================================================
          MODAL INTERLACES
          ==================================================================== */}

      {/* Product Form Modal */}
      {activeProductModal && (
        <ProductForm
          product={activeProductModal === "new" ? null : activeProductModal}
          categories={categories}
          onSave={async (pPayload: Omit<Product, "id">) => {
            if (activeProductModal === "new") {
              await createProduct(pPayload);
            } else {
              await updateProduct({ id: activeProductModal.id!, updates: pPayload });
            }
            clearProductCache();
            const revalidateUrl = process.env.NEXT_PUBLIC_REVALIDATE_URL || "https://customer-website-1.onrender.com/api/revalidate";
            const revalidateSecret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || "";
            if (revalidateSecret) {
              const paths = ["/", "/products"];
              if (activeProductModal !== "new" && activeProductModal?.id) paths.push(`/products/${activeProductModal.id}`);
              try { await fetch(revalidateUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths, secret: revalidateSecret }) }); } catch {}
            }
          }}
          onClose={() => setActiveProductModal(null)}
        />
      )}

      {/* Category Form Modal */}
      {activeCategoryModal && (
        <CategoryForm
          category={activeCategoryModal === "new" ? null : activeCategoryModal}
          onSave={async (cPayload: Omit<Category, "id">) => {
            if (activeCategoryModal === "new") {
              await createCategory(cPayload);
            } else {
              await updateCategory({ id: activeCategoryModal.id!, updates: cPayload });
            }
          }}
          onClose={() => setActiveCategoryModal(null)}
        />
      )}

      {/* Delivery Boy Form Modal */}
      {activeDboyModal && (
        <DeliveryBoyForm
          boy={activeDboyModal === "new" ? null : activeDboyModal}
          onSave={async (dPayload: Omit<DeliveryBoy, "id" | "basket">) => {
            if (activeDboyModal === "new") {
              await createDeliveryBoy(dPayload);
            } else {
              await updateDeliveryBoy({ id: activeDboyModal.id!, updates: dPayload });
            }
          }}
          onClose={() => setActiveDboyModal(null)}
        />
      )}

      {/* Refund Processor Modal */}
      {activeRefundModal && (
        <RefundModal
          order={activeRefundModal}
          onClose={() => setActiveRefundModal(null)}
          onRefundProcessed={async (payload: any, isRazorpay: boolean) => {
            if (isRazorpay) {
              await processRazorpayRefund(payload);
            } else {
              await recordManualRefund({
                orderId: payload.orderId,
                amount: payload.amount,
                reason: payload.reason,
                razorpayRefundId: "manual_" + Date.now(),
              });
              await updateOrderStatus({
                userId: payload.userId,
                orderId: payload.orderId,
                status: "Cancelled",
                extraFields: { cancelledAt: new Date().toISOString(), cancelReason: "Refunded" },
              });
            }
            setActiveRefundModal(null);
          }}
        />
      )}

      {progressBoy && (
        <EmployeeProgressModal
          employeeId={progressBoy.id!}
          name={progressBoy.name}
          phone={progressBoy.phone}
          salary={progressBoy.salary || 0}
          role="deliveryBoy"
          totalEarnings={progressBoy.totalEarnings || 0}
          existingBonuses={progressBoy.bonuses}
          overtimeHours={progressBoy.overtimeHours}
          onClose={() => setProgressBoy(null)}
        />
      )}

      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
    </div>
    </ErrorBoundary>
  );
}

export default function AdminDashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}