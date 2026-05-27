// app/layout.tsx

import "./globals.css";
import Navbar from "../components/Navbar";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <div className="pt-20">{children}</div>
      </body>
    </html>
  );
}
