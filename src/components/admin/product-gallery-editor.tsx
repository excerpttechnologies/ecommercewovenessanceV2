"use client";
import Image from "next/image";
import { ArrowDown, ArrowUp, Image as ImageIcon, Loader2, RotateCcw, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildGalleryImages, GALLERY_SLOT_LIMIT, galleryViewLabel } from "@/lib/product-gallery";
import { cn, isRemoteImageSource } from "@/lib/utils";

/**
 * Storefront gallery editor for the existing admin product drawer.
 * Reuses productWebMeta.extraImages (ordered) and the optional primary override;
 * the ERP/barcode photo remains the default and is never overwritten.
 */
export function ProductGalleryEditor({
  sku,
  labelContext,
  baseImage,
  primary,
  extras,
  erpExtras = [],
  onPrimaryChange,
  onExtrasChange,
}: {
  /** Product code used to store uploaded photos under uploads/products/<sku>/. */
  sku?: string;
  labelContext: string;
  baseImage?: string;
  primary: string;
  extras: string[];
  /** Read-only alternate views already stored on the ERP product. */
  erpExtras?: string[];
  onPrimaryChange: (value: string) => void;
  onExtrasChange: (value: string[]) => void;
}) {
  const slotCount = Math.max(0, GALLERY_SLOT_LIMIT - 1);
  const extraSlots = Array.from({ length: slotCount }, (_, index) => extras[index] ?? "");
  const effectivePrimary = primary.trim() || baseImage?.trim() || "";
  const websitePreview = buildGalleryImages(primary, extraSlots, baseImage);
  const preview = buildGalleryImages(primary, [...extraSlots, ...erpExtras], baseImage);

  const setExtra = (index: number, value: string) => {
    const next = [...extraSlots];
    next[index] = value;
    onExtrasChange(next);
  };

  const removeExtra = (index: number) => setExtra(index, "");

  const moveExtra = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= slotCount) return;
    const next = [...extraSlots];
    [next[index], next[target]] = [next[target], next[index]];
    onExtrasChange(next);
  };

  /** Promote an extra image to primary; the previous primary takes its slot (when it exists). */
  const makePrimary = (index: number) => {
    const promoted = extraSlots[index]?.trim();
    if (!promoted) return;
    const previousPrimary = primary.trim() || baseImage?.trim() || "";
    const next = [...extraSlots];
    next[index] = previousPrimary;
    onPrimaryChange(promoted === baseImage?.trim() ? "" : promoted);
    onExtrasChange(next);
  };

  const resetPrimary = () => onPrimaryChange("");

  const fileInput = useRef<HTMLInputElement>(null);
  const pickTarget = useRef<{ mode: "multi" } | { mode: "slot"; slot: number }>({ mode: "multi" });
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; completed: number; fileName: string; percent: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const availableSlots = () => {
    const slots: number[] = [];
    if (!primary.trim() && !baseImage?.trim()) slots.push(0);
    extraSlots.forEach((value, index) => {
      if (!value.trim()) slots.push(index + 1);
    });
    return slots;
  };

  const chooseFile = (slot?: number) => {
    if (!sku || uploadingSlot !== null) return;
    setUploadError(null);
    setUploadNotice(null);
    pickTarget.current = slot === undefined ? { mode: "multi" } : { mode: "slot", slot };
    fileInput.current?.click();
  };

  const uploadOne = (
    file: File,
    productSku: string,
    progress: { total: number; completed: number },
  ) => new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/v1/admin/products/gallery/upload");
    request.withCredentials = true;
    request.timeout = 120_000;
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      setUploadProgress({
        total: progress.total,
        completed: progress.completed,
        fileName: file.name,
        percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
      });
    };
    request.onerror = () => reject(new Error("Network error while uploading. Please try again."));
    request.ontimeout = () => reject(new Error("The upload timed out. Please try again."));
    request.onload = () => {
      let body: { ok?: boolean; data?: { url?: string }; error?: { message?: string } } = {};
      try {
        body = JSON.parse(request.responseText) as typeof body;
      } catch {
        // The HTTP status still explains the failure.
      }
      if (request.status < 200 || request.status >= 300 || body.ok === false) {
        reject(new Error(body.error?.message ?? `The image could not be uploaded (HTTP ${request.status})`));
        return;
      }
      const url = body.data?.url;
      if (typeof url !== "string" || !url) {
        reject(new Error("The upload did not return an image URL"));
        return;
      }
      resolve(url);
    };
    const form = new FormData();
    form.append("file", file);
    form.append("sku", productSku);
    request.send(form);
  });

  const runUploads = async (selected: File[], targetSlots: number[]) => {
    if (!sku || !selected.length || !targetSlots.length) return;
    const files = selected.slice(0, targetSlots.length);
    setUploadError(null);
    setUploadNotice(
      selected.length > files.length
        ? `Only ${files.length} of ${selected.length} selected photos fit the remaining slots.`
        : null,
    );
    // Keep a local working copy so several files in one batch fill sequential slots
    // without waiting for React to re-render between uploads.
    let workingPrimary = primary;
    const workingExtras = [...extraSlots];
    let uploaded = 0;

    for (let index = 0; index < files.length; index += 1) {
      const slot = targetSlots[index];
      setUploadingSlot(slot);
      setUploadProgress({ total: files.length, completed: index, fileName: files[index].name, percent: 0 });
      try {
        const url = await uploadOne(files[index], sku, { total: files.length, completed: index });
        const duplicate =
          workingPrimary.trim() === url || workingExtras.some((value) => value.trim() === url);
        if (duplicate) {
          setUploadNotice(`${files[index].name} is already in this gallery.`);
          continue;
        }
        if (slot === 0) {
          workingPrimary = url;
          onPrimaryChange(url);
        } else {
          workingExtras[slot - 1] = url;
          onExtrasChange([...workingExtras]);
        }
        uploaded += 1;
      } catch (error) {
        setUploadError((error as Error).message);
      }
    }

    setUploadingSlot(null);
    setUploadProgress(null);
    if (uploaded > 0) {
      setUploadNotice(`${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded. Save the product to publish the gallery.`);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length || !sku) return;
    const target = pickTarget.current;
    if (target.mode === "slot") {
      void runUploads(selected.slice(0, 1), [target.slot]);
      return;
    }
    const slots = availableSlots();
    if (!slots.length) {
      setUploadError(`All ${GALLERY_SLOT_LIMIT} website image slots are filled. Replace or remove an image first.`);
      return;
    }
    void runUploads(selected, slots);
  };

  return (
    <section className="rounded-sm border border-line bg-ivory/50 p-3">
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileInput}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Product gallery</p>
          <p className="mt-0.5 text-[11px] text-muted">
            Up to {GALLERY_SLOT_LIMIT} real photos. Use the same product, colour and design for every view.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-olive shadow-sm">
          {preview.length} / {GALLERY_SLOT_LIMIT}
        </span>
      </div>

      {sku && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => chooseFile()}
            disabled={uploadingSlot !== null || availableSlots().length === 0}
            className="h-8 gap-1.5 text-[11px]"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload photos
          </Button>
          <span className="text-[10px] text-muted">
            Select several files at once · JPEG, PNG or WebP · up to 8 MB each
          </span>
        </div>
      )}

      {uploadProgress && (
        <div className="mb-2.5 rounded-sm border border-line bg-white p-2" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-[10px] text-olive">
            <span className="truncate">
              Uploading {uploadProgress.completed + 1} of {uploadProgress.total}: {uploadProgress.fileName}
            </span>
            <span className="shrink-0 font-semibold">{uploadProgress.percent}%</span>
          </div>
          <div
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uploadProgress.percent}
          >
            <div className="h-full bg-maroon transition-[width] duration-150" style={{ width: `${uploadProgress.percent}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {Array.from({ length: GALLERY_SLOT_LIMIT }, (_, index) => {
          const isPrimary = index === 0;
          const extraIndex = index - 1;
          const value = isPrimary ? primary : extraSlots[extraIndex] ?? "";
          const previewUrl = isPrimary ? effectivePrimary : value.trim();
          const label = galleryViewLabel(index, labelContext);
          return (
            <div key={index} className="flex gap-3 rounded-sm border border-line bg-white p-2">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm bg-line">
                {previewUrl ? (
                  <Image src={previewUrl} alt={`${label} preview`} fill unoptimized sizes="64px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-muted"><ImageIcon className="h-4 w-4" /></span>
                )}
                {isPrimary && (
                  <span className="absolute inset-x-0 bottom-0 bg-olive/80 py-0.5 text-center text-[8px] font-semibold uppercase tracking-wide text-white">Primary</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-olive">
                    {index + 1}. {label}
                  </p>
                  {isPrimary && primary.trim() !== "" && (
                    <button type="button" onClick={resetPrimary} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted hover:text-maroon">
                      <RotateCcw className="h-3 w-3" /> Use ERP image
                    </button>
                  )}
                </div>
                <Input
                  aria-label={`${label} image URL`}
                  value={value}
                  onChange={(event) => {
                    if (isPrimary) onPrimaryChange(event.target.value);
                    else setExtra(extraIndex, event.target.value);
                  }}
                  placeholder={isPrimary && baseImage ? "Upload a photo or leave blank to use the ERP image" : "Upload a photo or paste an image URL"}
                  className="mt-1 h-9 text-xs"
                />

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {sku && (
                    <button
                      type="button"
                      onClick={() => chooseFile(index)}
                      disabled={uploadingSlot !== null}
                      className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-olive hover:bg-maroon/5 hover:text-maroon disabled:opacity-40"
                    >
                      {uploadingSlot === index
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Upload className="h-3 w-3" />}
                      {uploadingSlot === index && uploadProgress
                        ? `Uploading ${uploadProgress.percent}%`
                        : uploadingSlot === index ? "Uploading…" : "Upload"}
                    </button>
                  )}
                  {!isPrimary && value.trim() && (
                    <>
                      <button type="button" onClick={() => makePrimary(extraIndex)} className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-olive hover:bg-maroon/5 hover:text-maroon">
                        <Star className="h-3 w-3" /> Set primary
                      </button>
                      <button type="button" onClick={() => moveExtra(extraIndex, -1)} disabled={extraIndex === 0} aria-label="Move image up" className="rounded-sm p-1 text-muted hover:bg-ivory hover:text-olive disabled:opacity-30">
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => moveExtra(extraIndex, 1)} disabled={extraIndex === slotCount - 1} aria-label="Move image down" className="rounded-sm p-1 text-muted hover:bg-ivory hover:text-olive disabled:opacity-30">
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => removeExtra(extraIndex)} className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </>
                  )}
                  {isPrimary && !previewUrl && <span className="text-[10px] text-muted">No ERP image found; upload a photo or paste a URL here.</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {uploadError && <p role="alert" className="mt-2 rounded-sm border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-800">{uploadError}</p>}
      {uploadNotice && <p role="status" aria-live="polite" className="mt-2 rounded-sm border border-line bg-white px-2.5 py-2 text-[11px] text-olive">{uploadNotice}</p>}

      {erpExtras.length > 0 && (
        <div className="mt-3 rounded-sm border border-line bg-white p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">From RetailERP ({erpExtras.length})</p>
          <ol className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
            {erpExtras.filter(isRemoteImageSource).map((src, index) => (
              <li key={`${src}-${index}`} className="relative h-14 w-11 shrink-0 overflow-hidden rounded-sm border border-line bg-line">
                <Image src={src} alt={`RetailERP gallery image ${index + 1}`} fill unoptimized sizes="44px" className="object-cover" />
              </li>
            ))}
          </ol>
          <p className="mt-1 text-[10px] leading-relaxed text-muted">
            These views are managed in RetailERP and shown automatically after the website images. They are not copied into this website record.
          </p>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-3 border-t border-line pt-2.5">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">Storefront preview</p>
          <ol className="flex gap-1.5 overflow-x-auto pb-1">
            {preview.map((src, index) => (
              <li key={`${src}-${index}`} className={cn("relative h-14 w-11 shrink-0 overflow-hidden rounded-sm border bg-line", index === 0 ? "border-gold ring-1 ring-gold/30" : "border-line")}>
                <Image src={src} alt={`Storefront gallery image ${index + 1}`} fill unoptimized sizes="44px" className="object-cover" />
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-2 rounded-sm bg-white px-2.5 py-2 text-[10px] leading-relaxed text-muted">
        Upload JPEG, PNG or WebP photographs (up to 8 MB each), or paste an existing CDN/ERP URL. Images are stored
        outside MongoDB and only their URLs are saved. AI view generation is not enabled on this deployment; never
        substitute an image from another product to fill a gallery slot.
      </p>

      <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
        <span>
          {websitePreview.length} website image(s)
          {erpExtras.length > 0 ? ` · ${erpExtras.length} ERP image(s)` : ""}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={resetPrimary} disabled={!primary.trim()} className="h-7 text-[10px]">
          Reset primary
        </Button>
      </div>
    </section>
  );
}
