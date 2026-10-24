"use client";
import { QRCodeSVG } from "qrcode.react";

export function ProductQrCode({ barcode, size = 64 }: { barcode: string; size?: number }) {
  return (
    <QRCodeSVG
      value={barcode}
      size={size}
      level="H"
      title={`RetailERP barcode ${barcode}`}
      bgColor="#ffffff"
      fgColor="#1d1b18"
    />
  );
}
