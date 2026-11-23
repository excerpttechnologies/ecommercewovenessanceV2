import { getErpConnection, getWebConnection } from "@/lib/db";
import { ProductWebMetaModel } from "@/models/web/content.models";
import { ERP_BARCODE_COLLECTIONS } from "@/lib/erp-mapping";
import type { Order, OrderItem } from "@/domain/types";

/**
 * Resolves the genuine product image URL for an order item.
 * 
 * Sources checked in order:
 * 1. Website overrides from productWebMeta (galleryPrimaryImage / extraImages)
 * 2. ERP barcodeLabel (image / imageUrl / filePath)
 * 3. ERP ecommerceproduct (image / images[0] via barcode, publishedBarcodes, or itemId)
 * 4. Style-prefix URL (e.g. /images/4A/4A1200.jpg -> https://erp.wovenessence.in/images/4A/4A1200.jpg)
 * 5. DigitalOcean Spaces public bucket root
 */
const ERP_MEDIA_BASE = "https://erp.wovenessence.in";

/**
 * A stored image whose filename is ANOTHER barcode's number (e.g. 4A1708.jpg) is a sibling
 * barcode's photo living on the parent item row (e.g. 10-PRAWSILK), so it must not be shown
 * for other barcodes (e.g. 256550). Files named after anything else (hashes, item codes) are allowed.
 */
export { formatImageUrl, imageBelongsToBarcode } from "@/lib/image-matcher";
import { formatImageUrl, imageBelongsToBarcode } from "@/lib/image-matcher";
import { barcodeImageUrl } from "@/lib/erp-images";

export async function resolveOrderItemImage(sku: string, currentImage?: string | null): Promise<string | undefined> {
  const cleanSku = String(sku || "").trim();
  if (!cleanSku) return undefined;

  const formattedCurrent = formatImageUrl(currentImage);
  if (formattedCurrent && imageBelongsToBarcode(formattedCurrent, cleanSku)) return formattedCurrent;
  if (!cleanSku) return undefined;

  try {
    // 1. Check web DB productwebmetas
    const webConn = await getWebConnection();
    const meta = await ProductWebMetaModel(webConn).findOne({ sku: cleanSku }).lean() as {
      galleryPrimaryImage?: string;
      extraImages?: string[];
    } | null;

    if (meta?.galleryPrimaryImage) {
      const formatted = formatImageUrl(meta.galleryPrimaryImage);
      if (formatted) return formatted;
    }
    if (Array.isArray(meta?.extraImages) && meta.extraImages[0]) {
      const formatted = formatImageUrl(meta.extraImages[0]);
      if (formatted) return formatted;
    }

    // 2. Check ERP DB
    const erpConn = await getErpConnection();
    if (!erpConn.db) return undefined;

    const label = await erpConn.db.collection(ERP_BARCODE_COLLECTIONS.labels).findOne({
      $or: [
        { barcodeNo: cleanSku },
        { barcodeGenerated: cleanSku },
        { oldBarcode: cleanSku },
      ],
    }, {
      projection: { image: 1, imageUrl: 1, filePath: 1, itemId: 1 },
    });

    const labelImg = formatImageUrl(
      (label?.image as string) || (label?.imageUrl as string) || (label?.filePath as string)
    );
    if (labelImg) return labelImg;

    // 3. Check ecommerceproduct
    const ecommMatch: Record<string, unknown>[] = [
      { barcode: cleanSku },
      { barcodes: cleanSku },
      { publishedBarcodes: cleanSku },
    ];
    if (label?.itemId) {
      ecommMatch.push({ itemId: label.itemId });
    }

    const ecomm = await erpConn.db.collection(ERP_BARCODE_COLLECTIONS.ecommerceProducts).findOne({
      $or: ecommMatch,
    }, {
      projection: { image: 1, images: 1 },
    });

    const rawEcommImage = (ecomm?.image as string) || (Array.isArray(ecomm?.images) ? (ecomm.images[0] as string) : null);
    if (rawEcommImage && imageBelongsToBarcode(rawEcommImage, cleanSku)) {
      const ecommImg = formatImageUrl(rawEcommImage);
      if (ecommImg) return ecommImg;
    }

    const publicSpacesImage = barcodeImageUrl(cleanSku);
    if (publicSpacesImage) return publicSpacesImage;

    // 4. Barcode prefix rule (e.g. 4A1200, 6A2197)
    const prefixMatch = /^(\d+[A-Za-z]+)/.exec(cleanSku);
    if (prefixMatch) {
      return `${ERP_MEDIA_BASE}/images/${prefixMatch[1]}/${encodeURIComponent(cleanSku)}.jpg`;
    }

    // 5. DigitalOcean Spaces direct root
    return `https://templeimg.blr1.digitaloceanspaces.com/${encodeURIComponent(cleanSku)}.jpg`;
  } catch (error) {
    console.error(`[order-image-resolver] Failed to resolve image for SKU ${sku}:`, error);
    return undefined;
  }
}

/**
 * Resolves product images for all items in an order.
 * Ensures historical orders and newly placed orders always have valid, working images.
 */
export async function resolveOrderImages<T extends Order | null | undefined>(order: T): Promise<T> {
  if (!order || !Array.isArray(order.items) || !order.items.length) return order;

  const resolvedItems: OrderItem[] = await Promise.all(
    order.items.map(async (item) => {
      const image = await resolveOrderItemImage(item.sku, item.image);
      return {
        ...item,
        ...(image ? { image } : { image: undefined }),
      };
    })
  );

  return {
    ...order,
    items: resolvedItems,
  };
}
