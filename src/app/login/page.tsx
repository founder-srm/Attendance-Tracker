"use client";

import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FC] px-4">
      <div className="w-full max-w-md">
        <div className="mb-12 text-center">
          <h1 className="font-serif text-5xl font-bold text-[#14213D] mb-2">
            Attendance Tracker
          </h1>

          <p className="text-gray-600">
            Admin Portal
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}