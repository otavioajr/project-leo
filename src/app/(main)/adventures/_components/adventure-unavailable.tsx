import Link from "next/link";
import { Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AdventureUnavailable() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-primary">Aventura indisponível</CardTitle>
          <CardDescription className="text-center">
            Esta aventura não está disponível no momento. Confira outras atividades na nossa página inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Mountain className="mx-auto mb-4 h-20 w-20 text-muted-foreground/40" />
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
