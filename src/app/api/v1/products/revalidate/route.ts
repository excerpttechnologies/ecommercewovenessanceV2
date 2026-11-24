import { NextResponse } from "next/server";
import { invalidateProductCaches } from "@/lib/cache-invalidation";

export async function POST() {
  try {
    invalidateProductCaches();
    return NextResponse.json({
      success: true,
      revalidated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Revalidation failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    invalidateProductCaches();
    return NextResponse.json({
      success: true,
      revalidated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Revalidation failed",
      },
      { status: 500 }
    );
  }
}
