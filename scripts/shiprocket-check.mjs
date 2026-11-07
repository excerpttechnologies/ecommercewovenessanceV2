#!/usr/bin/env node
/**
 * One-time Shiprocket credential + serviceability check.
 *
 * Safety:
 * - Never prints the password, email, token, phone numbers or addresses.
 * - Performs at most ONE login request. It never retries a login.
 * - Stops immediately on HTTP 403 / blocked / too-many-attempts responses.
 * - Does not create orders, shipments, pickups, labels or manifests.
 *
 * Usage:
 *   node scripts/shiprocket-check.mjs --dry-run
 *   node scripts/shiprocket-check.mjs                 # app-loaded value (dotenv semantics)
 *   node scripts/shiprocket-check.mjs --use-literal-password
 *
 * `--use-literal-password` reads the raw (unquoted) value from the env file so
 * an unquoted `#` can be diagnosed without changing the file first. Prefer
 * quoting the value in the env file and running without this flag.
 *
 * The env file defaults to .env (the production file in this repository).
 * Override with SHIPROCKET_ENV_FILE=/path/to/file.
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const useLiteralPassword = args.has("--use-literal-password");
const envFile = path.resolve(process.env.SHIPROCKET_ENV_FILE || ".env");

if (!fs.existsSync(envFile)) {
  console.error(`Env file not found: ${envFile}`);
  process.exit(1);
}

const raw = fs.readFileSync(envFile, "utf8");
const parsed = dotenv.parse(raw);
const lines = raw.split(/\r?\n/);

function occurrences(key) {
  const out = [];
  lines.forEach((line, index) => {
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`));
    if (match) out.push({ line: index + 1, value: match[1] });
  });
  return out;
}

function rawValue(key) {
  const found = occurrences(key);
  return found.length ? found[found.length - 1].value : "";
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const email = (parsed.SHIPROCKET_EMAIL || "").trim();
const appPassword = parsed.SHIPROCKET_PASSWORD || "";
const literalPassword = stripQuotes(rawValue("SHIPROCKET_PASSWORD"));
const password = useLiteralPassword ? literalPassword : appPassword;
const pickupPincode = (parsed.SHIPROCKET_PICKUP_PINCODE || "").replace(/\D/g, "");
const pickupLocation = (parsed.SHIPROCKET_PICKUP_LOCATION || "").trim();
const baseUrl = (
  parsed.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1/external"
).trim().replace(/\/+$/, "");

function duplicateInfo(key) {
  const found = occurrences(key);
  return { count: found.length, lines: found.map((item) => item.line) };
}

function reportVariable(name, value) {
  console.log(
    `${name}: present=${Boolean(value)} length=${value.length} ` +
      `leadingWhitespace=${/^\s/.test(value)} trailingWhitespace=${/\s$/.test(value)}`,
  );
}

console.log("=== Shiprocket environment audit (values are never printed) ===");
console.log(`envFile=${envFile}`);
reportVariable("SHIPROCKET_EMAIL", email);
reportVariable("SHIPROCKET_PASSWORD (app-loaded)", appPassword);
reportVariable("SHIPROCKET_PASSWORD (literal line)", literalPassword);
reportVariable("SHIPROCKET_PICKUP_PINCODE", pickupPincode);
console.log(
  `SHIPROCKET_PICKUP_LOCATION: present=${Boolean(pickupLocation)} length=${pickupLocation.length} ` +
    `looksLikeFullAddress=${/,/.test(pickupLocation)}`,
);
console.log(`SHIPROCKET_BASE_URL host=${baseUrl.replace(/^https?:\/\//, "").split("/")[0]}`);
for (const key of [
  "SHIPROCKET_EMAIL",
  "SHIPROCKET_PASSWORD",
  "SHIPROCKET_PICKUP_LOCATION",
  "SHIPROCKET_PICKUP_PINCODE",
]) {
  const info = duplicateInfo(key);
  if (info.count > 1) {
    console.log(`DUPLICATE ${key}: ${info.count} entries at lines ${info.lines.join(", ")} (last value wins)`);
  }
}
const passwordLine = occurrences("SHIPROCKET_PASSWORD").map((item) => item.value).pop() || "";
console.log(
  `SHIPROCKET_PASSWORD line: quoted=${/^['"]/.test(passwordLine.trim())} ` +
    `containsHash=${passwordLine.includes("#")} ` +
    `charsAfterHash=${passwordLine.includes("#") ? passwordLine.length - passwordLine.indexOf("#") - 1 : 0}`,
);
console.log(
  `Diagnosis: dotenv/app sees ${appPassword.length} chars; the literal line has ${literalPassword.length} chars.`,
);
console.log(`Mode: ${useLiteralPassword ? "literal line value" : "application-loaded value"}`);

const missing = [];
if (!email) missing.push("SHIPROCKET_EMAIL");
if (!password) missing.push("SHIPROCKET_PASSWORD");
if (!pickupPincode || pickupPincode.length !== 6) missing.push("SHIPROCKET_PICKUP_PINCODE (6 digits)");
if (missing.length) {
  console.error(`Missing/invalid: ${missing.join(", ")}`);
  process.exit(1);
}

if (dryRun) {
  console.log("Dry run: no network request made.");
  process.exit(0);
}

function sanitize(message, token) {
  let out = String(message ?? "");
  const secrets = [password, email, token].filter(Boolean);
  for (const secret of secrets) out = out.split(secret).join("[redacted]");
  out = out.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  out = out.replace(/[A-Za-z0-9_-]{40,}/g, "[redacted-token]");
  return out.slice(0, 400);
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text.slice(0, 300) };
  }
}

async function main() {
  const loginUrl = `${baseUrl}/auth/login`;
  const loginStarted = Date.now();
  let response;
  try {
    response = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.log("=== Authentication ===");
    console.log("Login HTTP status: network error");
    console.log(`Error: ${sanitize(error?.message)}`);
    console.log("No retry performed.");
    process.exit(3);
  }

  const body = await readJson(response);
  const durationMs = Date.now() - loginStarted;
  const message = sanitize(body.message ?? body.error ?? "");
  const token = typeof body.token === "string" ? body.token : "";

  console.log("=== Authentication ===");
  console.log(`Login HTTP status: ${response.status}`);
  console.log(`Duration: ${durationMs}ms`);
  console.log(`Authentication success: ${response.ok && Boolean(token)}`);
  if (message) console.log(`Sanitized message: ${message}`);
  console.log(`Token present: ${Boolean(token)} (value never printed)`);

  if (
    response.status === 403 ||
    /block|too many|attempt limit|suspended|disabled/i.test(message)
  ) {
    console.log("STOP: Shiprocket returned an account-blocking response. No retry performed.");
    console.log("Do not retry. Contact Shiprocket / correct the account manually.");
    process.exit(2);
  }
  if (!response.ok || !token) {
    console.log("Authentication failed. No retry performed.");
    process.exit(3);
  }

  const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };

  // Read-only: registered pickup locations (nickname is what order creation needs).
  try {
    const pickupRes = await fetch(`${baseUrl}/settings/company/pickup`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    const pickupBody = await readJson(pickupRes);
    const list =
      pickupBody?.data?.shipping_address ??
      pickupBody?.data ??
      pickupBody?.shipping_address ??
      [];
    console.log("=== Registered pickup locations (read-only) ===");
    console.log(`Pickup lookup HTTP status: ${pickupRes.status}`);
    if (Array.isArray(list)) {
      console.log(`Count: ${list.length}`);
      for (const item of list.slice(0, 20)) {
        console.log(
          `- nickname=${item.pickup_location ?? item.nickname ?? "?"} ` +
            `pincode=${item.pincode ?? "?"} city=${item.city ?? "?"} ` +
            `active=${item.is_active ?? item.status ?? "?"}`,
        );
      }
    } else {
      console.log("Pickup lookup returned an unexpected shape.");
    }
  } catch (error) {
    console.log(`Pickup lookup failed (ignored): ${sanitize(error?.message)}`);
  }

  // Read-only: serviceability for both requested destinations.
  for (const deliveryPincode of ["580020", "110001"]) {
    const params = new URLSearchParams({
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: "0.5",
      cod: "0",
    });
    const url = `${baseUrl}/courier/serviceability/?${params.toString()}`;
    const started = Date.now();
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
      const data = await readJson(res);
      const couriers = data?.data?.available_courier_companies;
      console.log(`=== Serviceability ${pickupPincode} -> ${deliveryPincode} (weight 0.5kg, prepaid) ===`);
      console.log(`HTTP status: ${res.status} (${Date.now() - started}ms)`);
      if (!res.ok) {
        const msg = sanitize(data?.message ?? data?.error ?? "");
        if (msg) console.log(`Sanitized message: ${msg}`);
        continue;
      }
      if (!Array.isArray(couriers)) {
        console.log("Unexpected response shape (no available_courier_companies array).");
        continue;
      }
      console.log(`Courier count: ${couriers.length}`);
      const sorted = [...couriers].sort(
        (a, b) =>
          Number(a.freight_charge ?? a.rate ?? a.net_charge ?? 0) -
          Number(b.freight_charge ?? b.rate ?? b.net_charge ?? 0),
      );
      for (const courier of sorted.slice(0, 15)) {
        const rate = courier.freight_charge ?? courier.rate ?? courier.net_charge ?? courier.total_charge ?? "?";
        const eta = courier.estimated_delivery_days ?? courier.etd ?? "?";
        console.log(`- ${courier.courier_name ?? "?"}: INR ${rate}, ETA ${eta}, cod=${courier.cod ?? "?"}`);
      }
      if (sorted.length) {
        const lowest = sorted[0];
        const rate = lowest.freight_charge ?? lowest.rate ?? lowest.net_charge ?? lowest.total_charge ?? "?";
        console.log(`Lowest rate: INR ${rate} (${lowest.courier_name ?? "?"})`);
      }
    } catch (error) {
      console.log(`=== Serviceability ${pickupPincode} -> ${deliveryPincode} ===`);
      console.log(`Request failed: ${sanitize(error?.message)}`);
    }
  }

  console.log("Done. No orders, shipments or pickups were created.");
}

main().catch((error) => {
  console.error(`Unexpected error: ${sanitize(error?.message)}`);
  process.exit(1);
});
