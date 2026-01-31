"use client";

import { PixConfigForm } from "./_components/pix-config-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { PixConfig } from "@/lib/types";
import { LoaderCircle } from "lucide-react";

export default function ConfiguracaoPixPage() {
  const firestore = useFirestore();
  const configRef = useMemoFirebase(() => doc(firestore, 'content', 'pix'), [firestore]);
  const { data: config, isLoading } = useDoc<PixConfig>(configRef);

  const defaultConfig: PixConfig = {
    pixCopiaECola: '',
    pixEnabled: false,
    instructions: '',
  };
  
  const currentConfig = config || defaultConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuracao PIX</CardTitle>
        <CardDescription>
          Configure o pagamento via PIX para suas aventuras. Cole o texto PIX copia e cola para gerar o QR Code automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex items-center justify-center p-8">
                <LoaderCircle className="animate-spin" />
            </div>
        ) : (
            <PixConfigForm config={currentConfig} />
        )}
      </CardContent>
    </Card>
  );
}
