import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Test database access by checking if we can count user profiles
    // RLS will allow select for authenticated or return empty if unauthenticated,
    // but the table itself should be accessible.
    const {
      data,
      error: dbError,
      count,
    } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (dbError) {
      return NextResponse.json(
        {
          success: false,
          status: "Database connection failed",
          error: dbError,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      status: "Supabase connection fully operational",
      message:
        "Successfully reached Supabase API and queried public.users table.",
      activeProfileCount: count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        status: "Backend initialization failed",
        error: error.message || error,
      },
      { status: 500 },
    );
  }
}
