import { vi } from "vitest";

/**
 * Next.js' revalidatePath needs a request/static-generation store, which does not exist in
 * unit tests. Admin write handlers call it through lib/cache-invalidation; stub it so those
 * handlers can be tested without a running Next server. Production behaviour is unchanged.
 */
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
