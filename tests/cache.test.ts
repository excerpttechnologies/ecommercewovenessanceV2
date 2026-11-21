import { beforeEach, describe, expect, it, vi } from "vitest";
import { cacheSize, cached, cachedSWR, clearCache, invalidateCache, invalidateCachePrefixes, stableKey } from "@/lib/cache";

describe("TTL cache", () => {
  beforeEach(() => clearCache());

  it("reuses a value until its TTL expires", async () => {
    const load = vi.fn(async () => ({ value: 1 }));
    await expect(cached("k", 10_000, load)).resolves.toEqual({ value: 1 });
    await expect(cached("k", 10_000, load)).resolves.toEqual({ value: 1 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight load between concurrent callers", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const load = vi.fn(async () => {
      await gate;
      return 42;
    });

    const calls = Array.from({ length: 50 }, () => cached("same-key", 10_000, load));
    release();
    const results = await Promise.all(calls);

    expect(load).toHaveBeenCalledTimes(1);
    expect(results.every((value) => value === 42)).toBe(true);
  });

  it("does not cache failures", async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error("ERP down"))
      .mockResolvedValueOnce("ok");

    await expect(cached("k", 10_000, load)).rejects.toThrow("ERP down");
    await expect(cached("k", 10_000, load)).resolves.toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reloads after the TTL and keeps different keys separate", async () => {
    vi.useFakeTimers();
    try {
      let sequence = 0;
      const load = vi.fn(async () => ++sequence);
      expect(await cached("a", 1_000, load)).toBe(1);
      expect(await cached("b", 1_000, load)).toBe(2);
      vi.advanceTimersByTime(999);
      expect(await cached("a", 1_000, load)).toBe(1);
      vi.advanceTimersByTime(2);
      expect(await cached("a", 1_000, load)).toBe(3);
      expect(load).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalidates by key prefix", async () => {
    const load = vi.fn(async () => "v");
    await cached("erp:facets:sarees", 10_000, load);
    await cached("web:inactive-barcodes", 10_000, load);
    expect(cacheSize()).toBe(2);

    invalidateCache("erp:");
    expect(cacheSize()).toBe(1);
    await cached("erp:facets:sarees", 10_000, load);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("serves stale data while one background refresh runs", async () => {
    vi.useFakeTimers();
    try {
      let sequence = 0;
      const load = vi.fn(async () => ++sequence);
      expect(await cachedSWR("swr", 1_000, 5_000, load)).toBe(1);
      vi.advanceTimersByTime(1_001);
      expect(await cachedSWR("swr", 1_000, 5_000, load)).toBe(1);
      await Promise.resolve();
      await Promise.resolve();
      expect(load).toHaveBeenCalledTimes(2);
      expect(await cachedSWR("swr", 1_000, 5_000, load)).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalidates several prefixes at once (admin product write)", async () => {
    const load = vi.fn(async () => "v");
    await cached("erp:catalog:sarees", 10_000, load);
    await cached("erp:home-sections:10", 10_000, load);
    await cached("site:settings", 10_000, load);

    invalidateCachePrefixes(["erp:catalog:", "erp:home-sections:"]);
    expect(cacheSize()).toBe(1);
  });

  it("builds stable keys regardless of object key or filter-array order", () => {
    expect(stableKey({ b: 2, a: [1, 3] })).toBe(stableKey({ a: [3, 1], b: 2 }));
    expect(stableKey({ a: undefined })).toBe("{}");
  });
});
