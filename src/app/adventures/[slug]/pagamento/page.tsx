"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, runTransaction } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, Copy, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { Registration, PixConfig } from "@/lib/types";
import QRCode from "qrcode";
import Image from "next/image";
import Link from "next/link";

export default function PagamentoPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const registrationId = searchParams.get("registrationId");
  const token = searchParams.get("token");
  const slug = params.slug as string;

  const firestore = useFirestore();
  const { toast } = useToast();

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const isConfirmingRef = useRef(false);

  // Fetch registration data
  const registrationRef = useMemoFirebase(
    () => (registrationId ? doc(firestore, "registrations", registrationId) : null),
    [firestore, registrationId]
  );
  const { data: registration, isLoading: isLoadingRegistration } = useDoc<Registration>(registrationRef);

  // Fetch PIX config
  const pixConfigRef = useMemoFirebase(() => doc(firestore, "content", "pix"), [firestore]);
  const { data: pixConfig, isLoading: isLoadingPixConfig } = useDoc<PixConfig>(pixConfigRef);

  // Generate QR Code when PIX config is loaded
  useEffect(() => {
    if (pixConfig?.pixCopiaECola) {
      QRCode.toDataURL(pixConfig.pixCopiaECola, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error("Failed to generate QR Code:", err));
    }
  }, [pixConfig]);

  // Check if already confirmed
  useEffect(() => {
    if (registration?.paymentStatus === "awaiting_confirmation" || registration?.paymentStatus === "confirmed") {
      setPaymentConfirmed(true);
    }
  }, [registration]);

  const handleCopyPix = async () => {
    if (pixConfig?.pixCopiaECola) {
      try {
        await navigator.clipboard.writeText(pixConfig.pixCopiaECola);
        setCopied(true);
        toast({
          title: "Copiado!",
          description: "Codigo PIX copiado para a area de transferencia.",
        });
        setTimeout(() => setCopied(false), 3000);
      } catch {
        toast({
          title: "Erro ao copiar",
          description: "Nao foi possivel copiar. Tente selecionar e copiar manualmente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleConfirmPayment = async () => {
    if (!registrationId || isConfirmingRef.current) return;
    
    // Validar token antes de permitir a ação
    if (!token || token !== registration?.registrationToken) {
      toast({
        title: "Acesso Negado",
        description: "Voce nao tem permissao para confirmar este pagamento.",
        variant: "destructive",
      });
      return;
    }

    isConfirmingRef.current = true;
    setIsConfirming(true);
    
    try {
      await runTransaction(firestore, async (transaction) => {
        const regRef = doc(firestore, "registrations", registrationId);
        const regSnap = await transaction.get(regRef);
        
        if (!regSnap.exists()) throw new Error("Registro não encontrado");
        
        const regData = regSnap.data();
        if (["confirmed", "cancelled", "refunded"].includes(regData.paymentStatus)) {
          throw new Error("Status já está em estado terminal");
        }
        
        transaction.update(regRef, {
          paymentStatus: "awaiting_confirmation",
        });
      });
      
      setPaymentConfirmed(true);
      toast({
        title: "Pagamento Informado!",
        description: "Recebemos sua confirmacao. Aguarde a validacao do administrador.",
      });
    } catch (error) {
      console.error("Failed to confirm payment:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Nao foi possivel confirmar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
      isConfirmingRef.current = false;
    }
  };

  const isLoading = isLoadingRegistration || isLoadingPixConfig;

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!registrationId || !registration) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Inscricao Nao Encontrada</CardTitle>
            <CardDescription>
              Nao foi possivel encontrar os dados da sua inscricao. Por favor, tente se inscrever novamente.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href={`/adventures/${slug}`}>Voltar para Aventura</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Validar token
  if (!token || token !== registration.registrationToken) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>
              Voce nao tem permissao para acessar esta pagina de pagamento. O link pode ter expirado ou ser invalido.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-amber-500" />
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href={`/adventures/${slug}`}>Voltar para Aventura</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!pixConfig?.pixEnabled || !pixConfig?.pixCopiaECola) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-primary">Inscricao Realizada!</CardTitle>
            <CardDescription className="text-center">
              Sua inscricao para <strong>{registration.adventureTitle}</strong> foi registrada com sucesso!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
            <p className="text-muted-foreground">
              Em breve entraremos em contato com mais informacoes sobre o pagamento.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/">Voltar para Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (paymentConfirmed) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-primary">Aguardando Confirmacao</CardTitle>
            <CardDescription className="text-center">
              Sua inscricao para <strong>{registration.adventureTitle}</strong> esta aguardando a confirmacao do pagamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Clock className="mx-auto mb-4 h-16 w-16 text-amber-500" />
            <p className="text-muted-foreground">
              O administrador ira verificar seu pagamento em breve. Voce recebera uma confirmacao por e-mail.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link href="/">Voltar para Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl text-primary">Complete sua Inscricao</CardTitle>
          <CardDescription>
            Para confirmar sua inscricao em <strong>{registration.adventureTitle}</strong>, realize o pagamento via PIX.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Valor Total */}
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(registration.totalAmount || 0)}
            </p>
            <p className="text-xs text-muted-foreground">
              ({registration.groupSize} {registration.groupSize === 1 ? "pessoa" : "pessoas"})
            </p>
          </div>

          {/* QR Code */}
          {qrCodeUrl && (
            <div className="flex flex-col items-center">
              <p className="mb-2 text-sm font-medium">Escaneie o QR Code:</p>
              <div className="rounded-lg border bg-white p-2">
                <Image
                  src={qrCodeUrl}
                  alt="QR Code PIX"
                  width={300}
                  height={300}
                  className="rounded"
                />
              </div>
            </div>
          )}

          {/* PIX Copia e Cola */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Ou copie o codigo PIX:</p>
            <div className="flex gap-2">
              <div className="flex-1 overflow-hidden rounded-md border bg-muted p-3">
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {pixConfig.pixCopiaECola}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyPix}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Instruções adicionais */}
          {pixConfig.instructions && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">{pixConfig.instructions}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            className="w-full"
            size="lg"
            onClick={handleConfirmPayment}
            disabled={isConfirming || (!token || token !== registration?.registrationToken)}
          >
            {isConfirming ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              "Ja Paguei"
            )}
          </Button>
          <Button variant="ghost" asChild className="w-full">
            <Link href={`/adventures/${slug}`}>Voltar para Aventura</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
