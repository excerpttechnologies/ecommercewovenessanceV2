
import { Schema, type Connection } from "mongoose";
import { getModel } from "../_util";

export const INSTAGRAM_CURATION_GROUP_KEYS = [
  "default",
  "sarees",
  "fabrics",
  "plain-fabrics",
  "dupatta",
  "pavada",
  "dhotis",
  "best-buy",
  "new-arrivals",
] as const;

const InstagramImageSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      default: "",
      maxlength: 200,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: true },
);

const InstagramCurationSchema = new Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
      default: "Shop our Instagram edit",
    },
    description: {
      type: String,
      default: "Discover the pieces we are sharing on Instagram.",
    },
    skus: {
      type: [String],
      default: [],
    },
    images: {
      type: [InstagramImageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export function InstagramCurationModel(conn: Connection) {
  return getModel(conn, "InstagramCuration", InstagramCurationSchema);
}
