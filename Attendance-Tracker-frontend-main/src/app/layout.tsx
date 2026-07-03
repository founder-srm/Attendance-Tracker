import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";
// Assuming you are using a global CSS file inside src/styles or src/app based on Next default
import "../styles/globals.css"; // Adjust this path to wherever your tailwind directives are

export const metadata: Metadata = {
  title: "Founders' Club | Attendance Tracker",
  description: "Automated attendance management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-zinc-50 text-zinc-950">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}