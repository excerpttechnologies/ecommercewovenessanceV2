import mongoose from "mongoose";
import { config } from "dotenv";
config();
const uri = process.env.ERP_MONGODB_URI || process.env.ERP_MONGO_URI || process.env.MONGODB_URI!;
const dbName = process.env.ERP_DB_NAME || "grooretailerp1";
(async () => {
  const conn = await mongoose.createConnection(uri, { dbName }).asPromise();
  const col = conn.db!.collection("ecommerceproduct");
  const total = await col.countDocuments({});
  console.log("total ecommerceproduct:", total);
  console.log("status distinct:", await col.distinct("status"));
  console.log("isPublished distinct:", await col.distinct("isPublished"));
  console.log("isActive distinct:", await col.distinct("isActive"));
  console.log("productType distinct:", await col.distinct("productType"));
  // sample docs
  const sample = await col.find({}).project({ productType:1, status:1, isPublished:1, isActive:1, isBestBuy:1, displayName:1, itemId:1, businessId:1, createdAt:1, barcode:1, barcodes:1, erpDocumentId:1 }).limit(15).toArray();
  console.log(JSON.stringify(sample, null, 1).slice(0, 8000));
  // combos
  const combos = await col.aggregate([
    { $group: { _id: { status: "$status", isPublished: "$isPublished", isActive: "$isActive" }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]).toArray();
  console.log("combos:", JSON.stringify(combos));
  await conn.close();
})().catch((e) => { console.error(e); process.exit(1); });
