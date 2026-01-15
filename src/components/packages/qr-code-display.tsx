"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({ value, size = 128, className }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        // If it's already a data URL (base64), use it directly
        if (value.startsWith("data:image")) {
          setQrDataUrl(value);
          return;
        }

        // Generate QR code from the URL or text value
        const dataUrl = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("Error generating QR code:", err);
        setError("Failed to generate QR code");
      }
    };

    generateQR();
  }, [value, size]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`} style={{ width: size, height: size }}>
        <span className="text-xs text-gray-500">QR Error</span>
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded animate-pulse ${className}`} style={{ width: size, height: size }}>
        <span className="text-xs text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrDataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={className}
    />
  );
}
