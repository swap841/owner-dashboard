// components/Sidebar.tsx

"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingBag,
  FolderTree,
  Package,
  Bike,
  ShoppingBasket,
  BarChart3,
  RotateCcw,
  CreditCard,
  Truck,
  Menu,
  X,
  UserCheck,
  Users,
  Image,
  Ticket,
  Settings,
  MessageSquare,
  Percent,
  FileText,
  Shield,
  MapPin,
  Sparkles,
  DraftingCompass,
  Banknote,
  Sun,
  Moon,
} from "lucide-react";

export type DashboardView =
  | "home"
  | "products"
  | "categories"
  | "coupons"
  | "banners"
  | "orders"
  | "deliveryBoys"
  | "baskets"
  | "workers"
  | "dispatchBaskets"
  | "earnings"
  | "refunds"
  | "payments"
  | "tickets"
  | "contacts"
  | "storeConfig"
  | "deliveryPartner"
  | "apiKeys"
  | "deliveryZones"
  | "outOfRadiusOrders"
  | "setupWizard"
  | "policyShipping"
  | "policyRefund"
  | "policyPrivacy"
  | "policyTerms"
  | "policyContact"
  | "reconciliation"
  | "customerAnalytics";

interface SidebarProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  ownerName?: string | null;
}

export default function Sidebar({ currentView, onViewChange, ownerName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const menuItems = [
    { id: "home", label: "Dashboard Home", icon: BarChart3, color: "text-emerald-500" },
    { id: "products", label: "Products", icon: ShoppingBag, color: "text-emerald-500" },
    { id: "categories", label: "Categories", icon: FolderTree, color: "text-teal-500" },
    { id: "coupons", label: "Coupons", icon: Percent, color: "text-pink-500" },
    { id: "banners", label: "Banners", icon: Image, color: "text-purple-500" },
    { id: "orders", label: "Orders", icon: Package, color: "text-amber-500" },
    { id: "deliveryBoys", label: "Delivery Boys", icon: Bike, color: "text-blue-500" },
    { id: "baskets", label: "Baskets", icon: ShoppingBasket, color: "text-teal-500" },
    { id: "workers", label: "Workers", icon: Users, color: "text-orange-500" },
    { id: "dispatchBaskets", label: "Dispatch Baskets", icon: ShoppingBasket, color: "text-indigo-500" },
    { id: "tickets", label: "Tickets", icon: Ticket, color: "text-red-500" },
    { id: "contacts", label: "Contacts", icon: MessageSquare, color: "text-pink-500" },
    { id: "storeConfig", label: "Store Config", icon: Settings, color: "text-emerald-500" },
    { id: "earnings", label: "Earnings & Analytics", icon: BarChart3, color: "text-violet-500" },
    { id: "customerAnalytics", label: "Customer Analytics", icon: Users, color: "text-indigo-500" },
    { id: "refunds", label: "Refunds", icon: RotateCcw, color: "text-rose-500" },
    { id: "payments", label: "Transactions", icon: CreditCard, color: "text-sky-500" },
    { id: "reconciliation", label: "Payment Reconciliation", icon: Banknote, color: "text-emerald-500" },
    { id: "deliveryPartner", label: "Delivery Partner", icon: Truck, color: "text-cyan-500" },
    { id: "outOfRadiusOrders", label: "Out-of-Radius Orders", icon: DraftingCompass, color: "text-amber-500" },
    { id: "deliveryZones", label: "Delivery Zones", icon: MapPin, color: "text-emerald-500" },
    { id: "apiKeys", label: "API Keys", icon: Shield, color: "text-red-500" },
    { id: "setupWizard", label: "Setup Wizard", icon: Sparkles, color: "text-purple-500" },
    { id: "policyShipping", label: "Shipping Policy", icon: FileText, color: "text-emerald-500" },
    { id: "policyRefund", label: "Refund Policy", icon: FileText, color: "text-emerald-500" },
    { id: "policyPrivacy", label: "Privacy Policy", icon: FileText, color: "text-emerald-500" },
    { id: "policyTerms", label: "Terms & Conditions", icon: FileText, color: "text-emerald-500" },
    { id: "policyContact", label: "Contact Us", icon: FileText, color: "text-emerald-500" },
  ] as const;

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Mobile Toggle Menu Bar */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 h-16 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-white shadow-md shadow-emerald-500/20">
            O
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Owner Dashboard
          </span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          aria-label="Toggle navigation"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-xs z-30 transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed md:sticky top-16 md:top-20 left-0 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-64 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md border-r border-zinc-200/50 dark:border-zinc-800/50 p-4 flex flex-col justify-between transition-transform duration-300 z-30 shadow-lg shadow-zinc-100/5 dark:shadow-none
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Dashboard Title for Desktop */}
          <div className="hidden md:flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-extrabold text-white shadow-lg shadow-emerald-500/30">
              O
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent leading-none">
                Owner Hub
              </span>
              <span className="text-xs text-zinc-500 font-medium mt-1">Management Portal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border group
                  ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 border-transparent hover:bg-zinc-200/50 dark:hover:bg-zinc-800/40 hover:text-zinc-950 dark:hover:text-zinc-50"
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] transition-transform duration-200 group-hover:scale-110
                    ${isActive ? item.color : "text-zinc-400 dark:text-zinc-500"}`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Owner Profile Snippet + Dark Mode Toggle */}
        <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 pt-4 mt-auto px-2 space-y-3">
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
          {ownerName && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Log-in Session</span>
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 truncate">
                  {ownerName}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
