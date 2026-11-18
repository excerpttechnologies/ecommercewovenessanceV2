
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isTrustedVirtualTryOnImageUrl } from "@/lib/virtual-try-on-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FASHN_RUN_URL = "https://api.fashn.ai/v1/run";
const FASHN_STATUS_URL = "https://api.fashn.ai/v1/status";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getApiKey() {
  return env.FASHN_API_KEY;
}

async function toDataUri(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function isValidImage(file: FormDataEntryValue | null): file is File {
  if (!(file instanceof File)) return false;

  return (
    ACCEPTED_IMAGE_TYPES.has(file.type) &&
    file.size > 0 &&
    file.size <= MAX_IMAGE_SIZE
  );
}

async function fetchProductImageAsDataUri(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      headers: { Accept: "image/jpeg,image/png,image/webp" },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("The product image server could not load this image.");
    }

    const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!contentType || !ACCEPTED_IMAGE_TYPES.has(contentType)) {
      throw new Error("The product image server returned an unsupported image.");
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_SIZE) {
      throw new Error("The product image is larger than 10 MB.");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("The product image could not be read.");

    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_SIZE) {
        await reader.cancel();
        throw new Error("The product image is larger than 10 MB.");
      }
      chunks.push(value);
    }

    if (!size) throw new Error("The product image is empty.");
    return `data:${contentType};base64,${Buffer.concat(chunks, size).toString("base64")}`;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST /api/v1/virtual-try-on
 *
 * Accepts:
 * - modelImage: customer's photo
 * - productImage: selected product's local image file, or
 * - productImageUrl: selected product's approved HTTPS image URL
 * - consent: "true"
 *
 * Returns a FASHN prediction ID.
 */
export async function POST(req: Request) {
  try {
    const apiKey = getApiKey();

    if (!apiKey) {
      return jsonError(
        "Virtual try-on API is not configured. Please contact the store.",
        503
      );
    }

    const formData = await req.formData();

    const modelImage = formData.get("modelImage");
    const productImage = formData.get("productImage");
    const productImageUrl = formData.get("productImageUrl");
    const consent = formData.get("consent");

    if (consent !== "true") {
      return jsonError(
        "Please confirm that you have permission to use this photo.",
        400
      );
    }

    if (!isValidImage(modelImage)) {
      return jsonError(
        "Please upload a JPG, PNG or WebP photo smaller than 10 MB.",
        400
      );
    }

    if (productImage !== null && productImageUrl !== null) {
      return jsonError("Please provide only one product image.", 400);
    }

    let productImageData: string;
    if (productImage !== null) {
      if (!isValidImage(productImage)) {
        return jsonError(
          "The saree product image could not be loaded. Please try again.",
          400
        );
      }
      productImageData = await toDataUri(productImage);
    } else if (typeof productImageUrl === "string") {
      if (!isTrustedVirtualTryOnImageUrl(productImageUrl, {
        base: env.ERP_IMAGE_BASE,
        spacesHosts: env.ERP_IMAGE_SPACES_HOSTS,
      })) {
        return jsonError("The product image URL is not an approved image source.", 400);
      }

      try {
        productImageData = await fetchProductImageAsDataUri(productImageUrl);
      } catch (error) {
        console.error("Virtual try-on product image fetch failed:", error);
        return jsonError(
          error instanceof Error ? error.message : "The product image could not be loaded.",
          502
        );
      }
    } else {
      return jsonError(
        "The saree product image could not be loaded. Please try again.",
        400
      );
    }

    const modelImageData = await toDataUri(modelImage);

    const fashnResponse = await fetch(FASHN_RUN_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_name: "tryon-max",
        inputs: {
          model_image: modelImageData,
          product_image: productImageData,
          resolution: "1k",
          generation_mode: "fast",
          output_format: "jpeg",
          num_images: 1,
        },
      }),
      cache: "no-store",
    });

    const data = await fashnResponse.json();

    if (!fashnResponse.ok) {
      console.error("FASHN submission failed:", {
        status: fashnResponse.status,
        error: data?.error,
      });

      return jsonError(
        data?.error?.message || "Unable to start virtual try-on.",
        fashnResponse.status === 429 ? 429 : 502
      );
    }

    if (!data?.id) {
      return jsonError("FASHN did not return a prediction ID.", 502);
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error("Virtual try-on submission error:", error);

    return jsonError("Something went wrong while starting virtual try-on.", 500);
  }
}

/**
 * GET /api/v1/virtual-try-on?id=<prediction-id>
 *
 * Checks whether the generated image is ready.
 */
export async function GET(req: Request) {
  try {
    const apiKey = getApiKey();

    if (!apiKey) {
      return jsonError("Virtual try-on API is not configured.", 503);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !/^[a-zA-Z0-9_-]{10,150}$/.test(id)) {
      return jsonError("A valid prediction ID is required.", 400);
    }

    const response = await fetch(
      `${FASHN_STATUS_URL}/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("FASHN status check failed:", {
        status: response.status,
        error: data?.error,
      });

      return jsonError("Unable to check virtual try-on status.", 502);
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      output: data.status === "completed" ? data.output : undefined,
      error:
        data.status === "failed"
          ? data.error?.message || "Image generation failed."
          : undefined,
    });
  } catch (error) {
    console.error("Virtual try-on status error:", error);

    return jsonError("Something went wrong while checking the result.", 500);
  }
}