"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken, isTokenValid, clearStoredToken } from "@/lib/auth";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = getStoredToken();

      if (!token || !isTokenValid(token)) {
        clearStoredToken();
        router.push("/login");
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    clearStoredToken();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthorized ? (
    <div className="min-h-screen bg-[#F7F8FC]">
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-[#14213D]">Attendance Tracker</h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-red-500 hover:text-red-400 border-red-500 hover:border-red-400"
          >
            Logout
          </Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard />
      </main>
    </div>
  ) : null;
}
