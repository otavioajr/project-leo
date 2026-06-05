"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { PixGroupSize } from "@/lib/types";
import QRCode from "qrcode";
import Image from "next/image";

function groupSizeLabel(size: PixGroupSize) {
  return size === 1 ? "PIX para 1 pessoa" : `PIX para ${size} pessoas`;
}

export function PixSlotCard({
  size,
  value,
  onChange,
}: {
  size: PixGroupSize;
  value: string;
  onChange: (next: string) => void;
}) {
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    if (value && value.trim()) {
      QRCode.toDataURL(value, {
        width: 200,
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{groupSizeLabel(size)}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Textarea
          placeholder={`Cole aqui o codigo PIX copia e cola para ${size} ${
            size === 1 ? "pessoa" : "pessoas"
          }...`}
          className="min-h-[120px] font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex items-center justify-center">
          {qrPreview ? (
            <Image
              src={qrPreview}
              alt={`QR Code PIX ${size}`}
              width={160}
              height={160}
              className="rounded-lg border"
            />
          ) : (
            <div className="flex h-[160px] w-[160px] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              Sem chave cadastrada
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
