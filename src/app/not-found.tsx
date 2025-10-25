import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-6">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="text-6xl font-bold text-muted-foreground mb-4">
            404
          </div>

          <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>

          <p className="text-muted-foreground mb-6">
            A página que você está procurando não existe ou foi movida.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button asChild className="flex-1">
              <Link href="/">Voltar ao início</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/login">Fazer login</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Precisa de ajuda?{" "}
            <Link
              href="mailto:suporte@elmosys.com"
              className="underline hover:text-foreground"
            >
              Entre em contato
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
