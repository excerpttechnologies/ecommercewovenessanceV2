import { DEFAULT_MENU } from "@/lib/default-menu";

export type ClassificationField = "By Weave" | "By Fabric" | "By Craft" | "By Occasion" | "By colour";

export type ClassificationOption = {
  productType: string;
  field: string;
  value: string;
};

export function isClassificationOptionDeleted(
  deletedOptions: readonly ClassificationOption[],
  productType: string,
  field: string,
  value: string,
): boolean {
  const normalizedValue = value.toLowerCase();
  return deletedOptions.some((option) =>
    option.productType === productType
    && option.field.toLocaleLowerCase() === field.toLocaleLowerCase()
    && option.value.toLowerCase() === normalizedValue,
  );
}

export function getProductClassificationOptions(productType: string, field: ClassificationField): string[] {
  const product = DEFAULT_MENU.find((node) => node.label === productType);
  const group = product?.children.find((node) => node.label.toLocaleLowerCase() === field.toLocaleLowerCase());
  return group?.children.map((node) => node.label) ?? [];
}
