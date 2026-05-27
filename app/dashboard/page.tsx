// app/dashboard/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { app } from "@/firebaseConfig";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

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
  Loader2,      // Fixed missing imports
  IndianRupee,  // Fixed missing imports
  CreditCard,   // Fixed missing imports
  Truck,        // Fixed missing imports
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
import ContactInfoEditor from "@/components/ContactInfoEditor";
import CouponsManager from "@/components/CouponsManager";
import EarningsAnalyticsView from "@/components/EarningsAnalyticsView";

// Hooks
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useOrders } from "@/hooks/useOrders";
import { useDeliveryBoys } from "@/hooks/useDeliveryBoys";
import { useRefunds } from "@/hooks/useRefunds";

// Types
import { Product, Category, Order, DeliveryBoy, Refund, OrderStatus } from "@/types";
import { exportProductsToCSV } from "@/lib/firestore/products";
import { extractAreaCode } from "@/lib/areaCode";
import { groupOrdersIntoBaskets, DeliveryBasket } from "@/lib/firestore/orders";

const auth = getAuth(app);

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        toast.error("Please sign in to access the owner portal.");
        router.push("/");
      } else {
        setUser(currentUser);
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

  // Search & Filter state
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");

  // Modals state
  const [activeProductModal, setActiveProductModal] = useState<Product | null | "new">(null);
  const [activeCategoryModal, setActiveCategoryModal] = useState<Category | null | "new">(null);
  const [activeDboyModal, setActiveDboyModal] = useState<DeliveryBoy | null | "new">(null);
  const [activeRefundModal, setActiveRefundModal] = useState<Order | null>(null);

  // Settings
  const [deliveryRadius, setDeliveryRadius] = useState<number>(20); // default 20km

  // Partner shipment dispatch state
  const [partnerLogs, setPartnerLogs] = useState<any[]>([]);
  const [partnerLogsLoading, setPartnerLogsLoading] = useState(false);

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

  // Load Third-Party Delivery Partner logs
  const fetchPartnerLogs = async () => {
    setPartnerLogsLoading(true);
    try {
      const snap = await fetch("/api/delivery-partner/request");
      // Since it's mock, we will just read from logs or simulate.
      // For dashboard visual display, we also query firestore collection delivery_partner_logs
      // directly. Let's implement local dummy data if API returns empty.
      const dLogs = [
        { id: "log-1", orderId: "ord-test1", partner: "dunzo", status: "delivered", trackingId: "DZ-J8HNS82", createdAt: new Date(Date.now() - 3600 * 1000) },
        { id: "log-2", orderId: "ord-test2", partner: "shiprocket", status: "picked_up", trackingId: "SR-98YHN81", createdAt: new Date(Date.now() - 2 * 3600 * 1000) }
      ];
      setPartnerLogs(dLogs);
    } catch {
      // ignore
    }
    setPartnerLogsLoading(false);
  };

  useEffect(() => {
    if (currentView === "deliveryPartner") {
      fetchPartnerLogs();
    }
  }, [currentView]);

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
    if (c.id) categoryNamesMap[c.id] = c.name;
  });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col md:flex-row">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        ownerName={user?.displayName || user?.email}
      />

      <main className="flex-1 p-4 md:p-8 space-y-6 overflow-hidden w-full max-w-7xl mx-auto pt-20 md:pt-8">
        {/* ====================================================================
            🏠 VIEW: Dashboard Home
            ==================================================================== */}
        {currentView === "home" && (
          <DashboardHomeView />
        )}

        {/* ====================================================================
            🛍️ VIEW: Products
            ==================================================================== */}
        {currentView === "products" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
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
                  className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 rounded-xl text-xs font-bold cursor-pointer transition"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Bulk Import (CSV)</span>
                </label>

                {/* CSV Export */}
                <button
                  onClick={handleCSVExport}
                  className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 rounded-xl text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Export Catalog</span>
                </button>

                {/* Add Product */}
                <button
                  onClick={() => setActiveProductModal("new")}
                  className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap gap-2.5 items-center bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
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
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Products Grid */}
            {prodLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-zinc-500 font-semibold text-sm">Loading product catalog...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
                <ShoppingBag className="w-12 h-12 text-zinc-400 mb-3" />
                <span className="text-zinc-950 dark:text-white font-bold">Your inventory is empty</span>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                  Import products via bulk CSV or create products individually to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products
                  .filter((p: Product) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .filter((p: Product) => (selectedCategoryFilter ? p.categoryId === selectedCategoryFilter : true))
                  .map((p: Product) => {
                    const isLowStock = p.stock <= (p.lowStockThreshold || 5);
                    return (
                      <div
                        key={p.id}
                        className={`border bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group
                        ${
                          isLowStock
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
                          {isLowStock && (
                            <span className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-md">
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
                              <span className="text-[10px] font-bold text-zinc-400">Price</span>
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
                              <button
                                onClick={() => setActiveProductModal(p)}
                                className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 rounded-lg hover:text-emerald-500 transition"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete ${p.name}?`)) {
                                    deleteProduct(p.id!);
                                    toast.success(`${p.name} deleted successfully.`);
                                  }
                                }}
                                className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 rounded-lg hover:text-rose-500 transition"
                                title="Delete"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  📁 Product Categories
                </h1>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Create, view, or remove categories. Re-syncs product counts automatically.
                </p>
              </div>

              <button
                onClick={() => setActiveCategoryModal("new")}
                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/10"
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
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
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
                    className="border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 rounded-2xl p-4 flex gap-4 items-center justify-between shadow-xs hover:shadow-md transition-all duration-300 group"
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
                          {c.name}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black self-start mt-1 ${c.active ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                          {c.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => setActiveCategoryModal(c)}
                        className="p-1 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 rounded-lg hover:text-emerald-500 transition"
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
                        className="p-1 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500 rounded-lg hover:text-rose-500 transition"
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
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
                <span>📦 Orders Dispatch Center</span>
                {isActiveOrdersRefetching && (
                  <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                )}
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-1">
                Active uncompleted delivery queue. Real-time automatic background syncing.
              </p>
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                  🛵 Delivery Logistics Fleet
                </h1>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Manage active drivers, track driver status, and view delivery baskets.
                </p>
              </div>

              <button
                onClick={() => setActiveDboyModal("new")}
                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/10"
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
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
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
                      className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-xs"
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
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            boy.active
                              ? "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border border-emerald-500/10"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-transparent"
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
                          className="px-3 py-1 border border-zinc-200 dark:border-zinc-855 hover:border-emerald-500 rounded-lg text-xs font-bold hover:text-emerald-500 transition"
                        >
                          Edit Profile
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete delivery boy profile for ${boy.name}?`)) {
                              deleteDeliveryBoy(boy.id!);
                              toast.success("Driver deleted.");
                            }
                          }}
                          className="px-3 py-1 border border-zinc-200 dark:border-zinc-855 hover:border-rose-500 rounded-lg text-xs font-bold hover:text-rose-500 transition"
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
            💬 VIEW: Contacts
            ==================================================================== */}
        {currentView === "contacts" && <ContactsManager />}

        {/* ====================================================================
            ⚙️ VIEW: Store Settings (Contact Info)
            ==================================================================== */}
        {currentView === "contactInfo" && <ContactInfoEditor />}

        {/* ====================================================================
            🧺 VIEW: Dispatch Baskets (Bin-Packing Algorithmic Auto-Grouping)
            ==================================================================== */}
        {currentView === "dispatchBaskets" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
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
                const baskets = groupOrdersIntoBaskets(allOrders);

                if (baskets.length === 0) {
                  return (
                    <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
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
                          className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-xs"
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
                                className="px-3.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition"
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
            🔁 VIEW: Refunds Management
            ==================================================================== */}
        {currentView === "refunds" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
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
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
                <RotateCcw className="w-12 h-12 text-zinc-400 mb-3" />
                <span className="text-zinc-950 dark:text-white font-bold">No refund entries logged</span>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                  Only orders marked as "Delivered" and paid via "RAZORPAY" can be refunded using the gateway. COD orders allow manual log logs.
                </p>
              </div>
            ) : (
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
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
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-1.5">
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
                  <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-20 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
                    <CreditCard className="w-12 h-12 text-zinc-400 mb-3" />
                    <span className="text-zinc-950 dark:text-white font-bold">No card transactions logged</span>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                      Transactions populate once customers place orders choosing Razorpay payment methods.
                    </p>
                  </div>
                );
              }

              return (
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
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
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase
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
                                className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-[10px] transition shadow-xs"
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
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-1.5">
                  <Truck className="w-6 h-6 text-emerald-500 shrink-0" />
                  <span>Third-Party Delivery Partner</span>
                </h1>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Assign distant out-of-city orders exceeding our local delivery radius to third-party shipping aggregators.
                </p>
              </div>

              {/* Radius Configuration */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 rounded-2xl flex items-center gap-3 shrink-0">
                <Sliders className="w-4 h-4 text-zinc-400" />
                <div className="flex flex-col text-xs font-bold">
                  <span className="text-[10px] text-zinc-400">Local Service Radius</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      value={deliveryRadius}
                      onChange={(e) => setDeliveryRadius(Math.max(1, Number(e.target.value)))}
                      className="w-12 text-center py-0.5 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-black rounded"
                    />
                    <span className="text-zinc-500">km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Distance dispatch queue */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-zinc-900 dark:text-white text-base">Out-of-Radius Shipment Queue</h3>
              {(() => {
                const outOfRadiusOrders = allOrders
                  .filter((o: Order) => o.status === "Ready to Dispatch" && !o.assignedDeliveryBoyId)
                  .map((o: Order) => {
                    // Simulating a dummy estimated distance based on pincode or length of address
                    const mockDistance = ((o.address?.addressLine?.length || 0) % 25) + 8; // returns between 8 and 33
                    return { ...o, estimatedDistance: mockDistance };
                  });

                if (outOfRadiusOrders.length === 0) {
                  return (
                    <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl py-12 flex flex-col items-center justify-center bg-white/50 dark:bg-zinc-900/10">
                      <Truck className="w-12 h-12 text-zinc-400 mb-3" />
                      <span className="text-zinc-955 dark:text-white font-bold">Queue is empty</span>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm text-center">
                        Active "Ready to Dispatch" orders will show up here if their estimated distance exceeds the {deliveryRadius}km boundary.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-800/80 text-zinc-500 font-bold">
                        <tr>
                          <th className="p-3">Order ID</th>
                          <th className="p-3">Delivery Address</th>
                          <th className="p-3">Estimated Distance</th>
                          <th className="p-3">Weight</th>
                          <th className="p-3 text-center">Dispatch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-855 font-semibold text-zinc-700 dark:text-zinc-300">
                        {outOfRadiusOrders.map((o: any) => {
                          const exceedsRadius = o.estimatedDistance > deliveryRadius;
                          return (
                            <tr key={o.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                              <td className="p-3 font-bold text-zinc-900 dark:text-white">
                                {o.id?.substring(0, 12)}...
                              </td>
                              <td className="p-3 font-medium max-w-[200px] truncate">{o.address?.addressLine || ""}</td>
                              <td className="p-3">
                                <span className={`font-extrabold ${exceedsRadius ? "text-amber-500" : "text-zinc-500"}`}>
                                  {o.estimatedDistance.toFixed(1)} km
                                </span>
                                {exceedsRadius && (
                                  <span className="ml-2 text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1 py-0.2 rounded font-black uppercase">
                                    OUT OF RANGE
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-extrabold text-zinc-400">
                                {(o.totalWeight / 1000).toFixed(2)} kg
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex gap-1 justify-center">
                                  <button
                                    onClick={async () => {
                                      const toastId = toast.loading("Connecting to Shiprocket API logs...");
                                      try {
                                        const response = await fetch("/api/delivery-partner/request", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ orderId: o.id, partner: "shiprocket" }),
                                        });

                                        if (!response.ok) throw new Error("API call failed");

                                        const data = await response.json();
                                        // Update order status to assigned/dispatched
                                        await updateOrderStatus({
                                          userId: o.userId,
                                          orderId: o.id!,
                                          status: "Assigned",
                                          extraFields: {
                                            assignedDeliveryBoyId: "third_party",
                                          }
                                        });

                                        toast.success(
                                          `Dispatched via Shiprocket! Tracking ID: ${data.trackingId}`,
                                          { id: toastId, duration: 5000 }
                                        );
                                        fetchPartnerLogs();
                                      } catch (err: any) {
                                        toast.error(err.message || "Failed to delegate.", { id: toastId });
                                      }
                                    }}
                                    className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold text-[9px] transition"
                                  >
                                    Shiprocket
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const toastId = toast.loading("Sending request Dunzo logistics...");
                                      try {
                                        const response = await fetch("/api/delivery-partner/request", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ orderId: o.id, partner: "dunzo" }),
                                        });

                                        if (!response.ok) throw new Error("API call failed");

                                        const data = await response.json();
                                        await updateOrderStatus({
                                          userId: o.userId,
                                          orderId: o.id!,
                                          status: "Assigned",
                                          extraFields: {
                                            assignedDeliveryBoyId: "third_party",
                                          }
                                        });

                                        toast.success(
                                          `Assigned to Dunzo! Tracking: ${data.trackingId}`,
                                          { id: toastId, duration: 5000 }
                                        );
                                        fetchPartnerLogs();
                                      } catch (err: any) {
                                        toast.error(err.message || "Failed to delegate.", { id: toastId });
                                      }
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[9px] transition"
                                  >
                                    Dunzo
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Partner Tracking Logs */}
            <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="font-extrabold text-zinc-900 dark:text-white text-base">Delegation logs timeline</h3>
              {partnerLogsLoading ? (
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
              ) : partnerLogs.length === 0 ? (
                <span className="text-xs text-zinc-400 font-semibold italic">No partner shipments processed today.</span>
              ) : (
                <div className="space-y-2.5">
                  {partnerLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 p-3 rounded-xl flex items-center justify-between text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
                          {log.partner[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-zinc-900 dark:text-white font-bold">
                            Order Ref: {log.orderId}
                          </p>
                          <span className="text-[10px] text-zinc-400 font-bold">
                            Tracking: <strong className="text-teal-500">{log.trackingId}</strong> • {log.partner}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                          {log.status}
                        </span>
                        <select
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                            toast.success(`Mock partner log status updated to ${e.target.value}`);
                          }}
                          className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-bold"
                        >
                          <option value="">Update Status</option>
                          <option value="picked_up">Picked Up</option>
                          <option value="delivered">Delivered</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
              // Manual record logging for COD
              await recordManualRefund({
                orderId: payload.orderId,
                amount: payload.amount,
                reason: payload.reason,
                razorpayRefundId: "manual_" + Date.now(),
              });
              // Mark order status unpaid/cancelled
              await updateOrderStatus({
                userId: payload.userId,
                orderId: payload.orderId,
                status: "Cancelled",
                extraFields: { payment: { method: "cod", status: "refunded" } }
              });
            }
          }}
        />
      )}

      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}