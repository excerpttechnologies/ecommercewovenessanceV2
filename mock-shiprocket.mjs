// Fake Shiprocket API for local testing. No dependencies.
// Run:  node mock-shiprocket.mjs
// Then in .env.local:
//   SHIPROCKET_BASE_URL=http://localhost:4010/v1/external
//   SHIPROCKET_EMAIL=test@example.com
//   SHIPROCKET_PASSWORD=dummy
//   SHIPROCKET_PICKUP_LOCATION=Primary
//   SHIPROCKET_WEBHOOK_TOKEN=local-test-token
//
// Optional failure simulation (start with env var):
//   FAIL=login   node mock-shiprocket.mjs   -> login returns 401
//   FAIL=create  node mock-shiprocket.mjs   -> create order returns 422
//   FAIL=awb     node mock-shiprocket.mjs   -> AWB assignment fails (order still created)

import http from "node:http";

const PORT = 4010;
const FAIL = process.env.FAIL || "";
let counter = 1000;

const REQUIRED = [
  "order_id", "order_date", "pickup_location", "billing_customer_name",
  "billing_address", "billing_city", "billing_pincode", "billing_state",
  "billing_country", "billing_email", "billing_phone", "order_items",
  "payment_method", "sub_total", "length", "breadth", "height", "weight",
];

const send = (res, status, obj) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};

http
  .createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : {};
      const path = req.url.replace("/v1/external", "");
      console.log(`\n→ ${req.method} ${path}`);
      if (raw) console.log(JSON.stringify(body, null, 2));

      if (path === "/auth/login") {
        if (FAIL === "login") return send(res, 401, { message: "Invalid email or password" });
        return send(res, 200, { token: "fake-token-" + Date.now() });
      }

      if (!(req.headers.authorization || "").startsWith("Bearer ")) {
        return send(res, 401, { message: "Unauthorized" });
      }

      if (path === "/orders/create/adhoc") {
        if (FAIL === "create") return send(res, 422, { message: "Wrong Pickup location", errors: { pickup_location: ["invalid"] } });
        const missing = REQUIRED.filter((k) => body[k] === undefined || body[k] === "");
        if (missing.length) {
          console.log("✗ MISSING FIELDS:", missing);
          return send(res, 422, { message: "Validation failed", errors: Object.fromEntries(missing.map((m) => [m, ["required"]])) });
        }
        if (!/^\d{10}$/.test(body.billing_phone)) return send(res, 422, { message: "Bad phone" });
        if (!/^\d{6}$/.test(String(body.billing_pincode))) return send(res, 422, { message: "Bad pincode" });
        if (!["COD", "Prepaid"].includes(body.payment_method)) return send(res, 422, { message: "Bad payment_method" });
        console.log("✓ payload looks valid");
        counter++;
        return send(res, 200, { order_id: counter, shipment_id: counter + 5000, status: "NEW" });
      }

      if (path === "/courier/assign/awb") {
        if (FAIL === "awb") return send(res, 400, { message: "Insufficient wallet balance" });
        return send(res, 200, {
          awb_assign_status: 1,
          response: { data: { awb_code: "FAKEAWB" + body.shipment_id, courier_name: "Fake Express" } },
        });
      }

      if (path === "/courier/generate/pickup") {
        return send(res, 200, { pickup_status: 1, response: { pickup_scheduled_date: "2026-10-27" } });
      }

      send(res, 404, { message: "Not found in mock" });
    });
  })
  .listen(PORT, () => console.log(`Mock Shiprocket listening on http://localhost:${PORT}  (FAIL="${FAIL}")`));
