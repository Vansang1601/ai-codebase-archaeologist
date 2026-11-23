import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const backendUrl = `${base}${pathname}${search}`;
  return NextResponse.redirect(backendUrl);
}
