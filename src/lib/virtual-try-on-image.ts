import { isAllowedImageUrl } from "@/lib/erp-images";

type AllowedImageOptions = {
  base?: string;
  spacesHosts?: string[];
};

export function isTrustedVirtualTryOnImageUrl(
  value: string,
  options: AllowedImageOptions = {}
): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      isAllowedImageUrl(url.toString(), options)
    );
  } catch {
    return false;
  }
}
