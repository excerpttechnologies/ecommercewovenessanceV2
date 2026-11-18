
"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type VirtualTryOnProps = {
  productImage: string;
  productName: string;
};

type TryOnStatus = "idle" | "uploading" | "processing" | "completed" | "failed";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function VirtualTryOn({
  productImage,
  productName,
}: VirtualTryOnProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [status, setStatus] = useState<TryOnStatus>("idle");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [progressText, setProgressText] = useState("");

  useEffect(() => {
    if (!photo) {
      setPhotoPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(photo);
    setPhotoPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [photo]);

  function selectPhoto(file?: File) {
    setError("");
    setResultUrl("");

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Your photo must be smaller than 10 MB.");
      return;
    }

    setPhoto(file);
    setStatus("idle");
  }

  async function startTryOn() {
    if (!photo) {
      setError("Please upload your photo first.");
      return;
    }

    if (!consent) {
      setError("Please confirm that you have permission to use this photo.");
      return;
    }

    setError("");
    setResultUrl("");
    setStatus("uploading");
    setProgressText("Preparing your photos...");

    try {
      const formData = new FormData();
      formData.append("modelImage", photo);
      formData.append("consent", "true");

      if (/^(https?:)?\/\//i.test(productImage)) {
        formData.append(
          "productImageUrl",
          new URL(productImage, window.location.origin).toString()
        );
      } else {
        const productResponse = await fetch(productImage);

        if (!productResponse.ok) {
          throw new Error("Unable to load the saree product image.");
        }

        const productBlob = await productResponse.blob();

        if (!ACCEPTED_TYPES.includes(productBlob.type)) {
          throw new Error("The selected product image is not a valid image.");
        }

        formData.append(
          "productImage",
          new File([productBlob], "selected-saree", { type: productBlob.type })
        );
      }

      setProgressText("Uploading your photos...");

      const submitResponse = await fetch("/api/v1/virtual-try-on", {
        method: "POST",
        body: formData,
      });

      const submitData = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(
          submitData.error || "Unable to start virtual try-on."
        );
      }

      const predictionId = submitData.id as string;

      if (!predictionId) {
        throw new Error("The AI service did not return a prediction ID.");
      }

      setStatus("processing");
      setProgressText("Creating your virtual saree look...");

      // Poll the backend for the result.
      for (let attempt = 0; attempt < 60; attempt++) {
        await wait(3000);

        const statusResponse = await fetch(
          `/api/v1/virtual-try-on?id=${encodeURIComponent(predictionId)}`,
          { cache: "no-store" }
        );

        const statusData = await statusResponse.json();

        if (!statusResponse.ok) {
          throw new Error(
            statusData.error || "Unable to check generation status."
          );
        }

        if (statusData.status === "completed") {
          const output = Array.isArray(statusData.output)
            ? statusData.output[0]
            : statusData.output;

          if (typeof output !== "string" || !output.startsWith("https://")) {
            throw new Error("The AI service returned an invalid image URL.");
          }

          setResultUrl(output);
          setStatus("completed");
          setProgressText("");
          return;
        }

        if (statusData.status === "failed" || statusData.status === "canceled") {
          throw new Error(
            statusData.error || "The AI image generation failed."
          );
        }

        setProgressText(
          attempt < 10
            ? "Creating your saree look..."
            : "Still working on your image. Please wait..."
        );
      }

      throw new Error(
        "Image generation is taking longer than expected. Please try again."
      );
    } catch (err) {
      setStatus("failed");
      setProgressText("");
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    }
  }

  function resetTryOn() {
    setResultUrl("");
    setError("");
    setStatus("idle");
    setProgressText("");
  }

  const isBusy = status === "uploading" || status === "processing";

  return (
    <section className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive">
          Virtual Experience
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink sm:text-2xl">
          Try This Saree on Me
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Upload your photo and preview how {productName} might look on you
          with AI.
        </p>
      </div>

      {!resultUrl && (
        <div className="mt-5">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center rounded-md bg-olive px-5 text-xs font-semibold uppercase tracking-wider text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {photo ? "Change Photo" : "Upload Your Photo"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              className="hidden"
              onChange={(event) => {
                selectPhoto(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />

            {photo && (
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  resetTryOn();
                }}
                disabled={isBusy}
                className="inline-flex h-11 items-center justify-center rounded-md border border-line px-5 text-xs font-semibold uppercase tracking-wider text-ink hover:border-olive disabled:opacity-50"
              >
                Remove Photo
              </button>
            )}
          </div>

          <p className="mt-2 text-xs text-muted">
            Use a clear, full-length, front-facing photo. JPG, PNG or WebP,
            maximum 10 MB.
          </p>

          {photoPreview && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Your photo
                </p>
                <div className="relative aspect-[3/4] max-w-[240px] overflow-hidden rounded-lg bg-stone-100">
                  <Image
                    src={photoPreview}
                    alt="Your uploaded photo"
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="240px"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Selected saree
                </p>
                <div className="relative aspect-[3/4] max-w-[240px] overflow-hidden rounded-lg bg-stone-100">
                  <Image
                    src={productImage}
                    alt={productName}
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="240px"
                  />
                </div>
              </div>
            </div>
          )}

          <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              disabled={isBusy}
              className="mt-0.5 h-4 w-4 accent-olive"
            />
            <span>
              I confirm that I have permission to use this photo for virtual
              try-on. I understand that it will be sent to an external AI
              service for image generation.
            </span>
          </label>

          <button
            type="button"
            onClick={startTryOn}
            disabled={!photo || !consent || isBusy}
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-md bg-ink px-6 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-olive disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {isBusy ? "Generating Your Look..." : "Try This Saree on Me"}
          </button>
        </div>
      )}

      {isBusy && (
        <div
          className="mt-5 rounded-lg bg-stone-50 p-5 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-olive" />
          <p className="mt-3 text-sm font-medium text-ink">{progressText}</p>
          <p className="mt-1 text-xs text-muted">
            Please keep this page open while your image is being generated.
          </p>
        </div>
      )}

      {error && (
        <div
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {resultUrl && (
        <div className="mt-6 border-t border-line pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-olive">
            Your virtual saree look
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div className="relative aspect-[3/4] max-w-md overflow-hidden rounded-lg bg-stone-100">
              <Image
                src={resultUrl}
                alt={`AI virtual try-on result for ${productName}`}
                fill
                unoptimized
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 448px"
              />
            </div>

            <div className="flex flex-col items-center gap-3 sm:items-start">
              <p className="text-sm font-medium text-ink">
                Share your look
              </p>
              <div className="rounded-lg border border-line bg-white p-3">
                <QRCodeSVG value={resultUrl} size={144} />
              </div>
              <p className="text-center text-xs text-muted sm:text-left">
                Scan this QR code to open your generated image.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={resultUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md bg-olive px-5 text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
            >
              Open Image
            </a>

            <a
              href={resultUrl}
              download="woven-essence-virtual-try-on.jpg"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border border-line px-5 text-xs font-semibold uppercase tracking-wider text-ink hover:border-olive"
            >
              Download Result
            </a>

            <button
              type="button"
              onClick={resetTryOn}
              className="inline-flex h-11 items-center justify-center rounded-md border border-line px-5 text-xs font-semibold uppercase tracking-wider text-ink hover:border-olive"
            >
              Try Again
            </button>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            AI-generated previews are illustrative. The actual saree colour,
            drape and appearance may vary.
          </p>
        </div>
      )}
    </section>
  );
}
