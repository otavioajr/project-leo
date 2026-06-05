"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import QRCode from "qrcode";
import Image from "next/image";

type LotePixFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
};

export function LotePixField({ label, value, onChange }: LotePixFieldProps) {
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value.trim()) {
      QRCode.toDataURL(value, {
        width: 120,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      })
        .then((url) => setQrPreview(url))
        .catch(() => setQrPreview(null));
    } else {
      setQrPreview(null);
    }
  }, [value]);

  return (
    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
      <Textarea
        placeholder={`Cole o PIX copia-e-cola do ${label}...`}
        className="min-h-[80px] font-mono text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex items-center justify-center">
        {qrPreview ? (
          <Image
            src={qrPreview}
            alt={`QR Code ${label}`}
            width={96}
            height={96}
            className="rounded border"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded border border-dashed text-[10px] text-muted-foreground">
            Sem PIX
          </div>
        )}
      </div>
    </div>
  );
}
