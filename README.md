# 🚀 Grocery Startup Owner Dashboard (Admin Portal)

This is the production-ready, full-stack owner dashboard (admin portal) designed for managing inventory, tracking logistics fleet, and processing order dispatches for our grocery startup.

---

## 🛠️ Technology Stack & Architecture

- **Framework**: Next.js App Router (React 19 + TypeScript)
- **Styles**: TailwindCSS (Modern green-themed emerald/teal visual engine)
- **Database & Auth**: Firebase Firestore & Client Authentication
- **State Caching**: React Query (`@tanstack/react-query`) for advanced data syncing and query optimization
- **Third Party Connections**: ImgBB SDK & Razorpay Payments Refund logs

---

## 💻 Local Installation & Run

### 1. Install Dependencies
Run the command below in the project root to install the modular dependencies (React Query, Lucide React, Recharts, and React Hot Toast):
```bash
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Create a file named `.env.local` in the root folder (preconfigured templates have been written for you):
```env
# ImgBB API Key (server-side only — used by /api/upload-photo proxy)
IMGBB_API_KEY=your_imgbb_api_key_here

# reCAPTCHA v3 Site Key for Firebase App Check
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=YOUR_RECAPTCHA_SITE_KEY

# Razorpay Test/Live API Keys
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=xxxx
```

### 3. Spin Up Development Server
Start the local server by running:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Required Firestore Composite Indexes

To support high-frequency, paginated query optimizations across multiple users' subcollections, you must create a **Collection Group Composite Index** in the Firebase Console:

### 1. Active Orders Dispatch Index
- **Collection ID**: `orders`
- **Scope**: `Collection Group`
- **Fields to Index**:
  1. `status` ➡️ `Ascending` (or Array)
  2. `orderDate` ➡️ `Descending`
- **Deploy Link**: [Create in Firebase Console](https://console.firebase.google.com/project/_/database/firestore/indexes)

*Note: When running the dashboard for the first time, if this index is missing, Firestore will output a direct index creation link in your browser console log. Click that link to build the index instantly.*

---

## 🛡️ Deploying Security Rules & App Check

### 1. Firestore Security Rules
We have written a highly optimized, strict permissions file named [firestore.rules](file:///c:/Users/iamsw/OneDrive/Desktop/my%20projects/my-app/my-app/firestore.rules) in the project root. To deploy it to your Firebase instance:
```bash
firebase deploy --only firestore:rules
```

### 2. Firebase App Check
We protect our operations against fraud and scraping using App Check initialized with reCAPTCHA v3.
- Generate a reCAPTCHA v3 site key in your [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin).
- Provide this site key as `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in `.env.local`.
- Register the site key inside the [Firebase Console App Check settings](https://console.firebase.google.com/project/_/appcheck).

---

## 💰 Budget Alerts Setup (Production Safe-Havens)

To protect your GCP billing account from runaway costs:
1. Open the [Google Cloud Console Billing Dashboard](https://console.cloud.google.com/billing).
2. Go to **Budgets & Alerts** in the left sidebar menu.
3. Click **Create Budget**.
4. Set a monthly budget threshold (e.g., $10 USD or $50 USD).
5. Set alert targets (e.g., email notifications when costs exceed 50%, 90%, and 100% of the threshold budget).
