"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  validateAdminCredentials,
  createMockToken,
  setStoredToken,
} from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      if (validateAdminCredentials(email, password)) {
        const token = createMockToken();

        setStoredToken(token);

        router.push("/admin/dashboard");
      } else {
        setError("Invalid email or password.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">

      <div>
        <h1 className="text-3xl font-bold">
          Admin Login
        </h1>

        <p className="text-gray-400 mt-2">
          Sign in to manage attendance
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >

        <div>
          <label className="block mb-2 text-sm">
            Email
          </label>

          <Input
            type="email"
            placeholder="admin@attendance.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block mb-2 text-sm">
            Password
          </label>

          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Signing In..." : "Login"}
        </Button>

      </form>
<div className="rounded-xl border border-gray-200 bg-gray-50 p-5">

  <p className="font-semibold text-[#14213D]">
    Demo Credentials
  </p>

  <p className="text-gray-600 mt-2">
    Email: admin@attendance.local
  </p>

  <p className="text-gray-600">
    Password: admin123
  </p>

</div>

    </div>
  );
}