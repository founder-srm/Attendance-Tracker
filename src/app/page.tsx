import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="font-serif text-2xl font-bold text-[#14213D]">
            Attendance Tracker
          </h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-180px)]">

          {/* Hero */}
          <div className="text-center">
            <h1 className="font-serif text-6xl font-bold text-[#14213D] mb-4">
              Attendance Tracker
            </h1>

            <p className="text-gray-600 text-xl mb-8">
              Manage meetings, members, and attendance with ease
            </p>

            <Link href="/login">
              <Button className="px-10 py-6 text-lg">
                Admin Login
              </Button>
            </Link>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-5xl">

            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200 text-center">
              <div className="text-5xl mb-4"></div>

              <h3 className="text-xl font-bold text-[#14213D] mb-3">
                Meeting Management
              </h3>

              <p className="text-gray-600">
                Create, edit and manage meetings easily.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200 text-center">
              <div className="text-5xl mb-4"></div>

              <h3 className="text-xl font-bold text-[#14213D] mb-3">
                Member Management
              </h3>

              <p className="text-gray-600">
                Add, remove and manage team members.
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200 text-center">
              <div className="text-5xl mb-4"></div>

              <h3 className="text-xl font-bold text-[#14213D] mb-3">
                Export Data
              </h3>

              <p className="text-gray-600">
                Export attendance data as CSV or JSON.
              </p>
            </div>

          </div>

          {/* Demo Credentials */}
          <div className="mt-14 w-full max-w-2xl">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
              <h3 className="text-2xl font-bold text-[#14213D] text-center mb-6">
                Demo Credentials
              </h3>

              <div className="bg-gray-100 rounded-lg p-5 space-y-2 text-center">
                <p>
                  <span className="font-semibold">Email:</span>{" "}
                  admin@attendance.local
                </p>

                <p>
                  <span className="font-semibold">Password:</span>{" "}
                  admin123
                </p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}