import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const backendUrl = `http://localhost:8000${pathname}${search}`;
  return NextResponse.redirect(backendUrl);
}
