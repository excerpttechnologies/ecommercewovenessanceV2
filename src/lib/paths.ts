/** Clean product URL for an ERP barcode product: /collections/sarees/8A3421. Safe for client components. */
export const barcodeProductPath = (group: string, barcode: string) => `/collections/${group}/${encodeURIComponent(barcode)}`;
