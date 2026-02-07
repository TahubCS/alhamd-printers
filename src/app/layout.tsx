import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Al-Hamd Printers | الحمد پرنٹرز",
  description: "Business Management System for Al-Hamd Printers - PVC Polybags & Packaging",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
