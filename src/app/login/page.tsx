"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import logo from "@/assets/logo.png";
import Image from "next/image";

export default function LoginPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementar lógica de login
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex justify-center mb-6 md:hidden">
          <div className="relative w-32 h-32">
            <Image
              src={logo}
              alt="Logo da Elmosys"
              className="object-contain"
              fill
            />
          </div>
        </div>

        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form className="p-6 md:p-8" onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Elmosys</h1>
                  <p className="text-muted-foreground text-balance">
                    Bem-vindo ao sistema da Elmo
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    required
                  />
                </Field>
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Senha</FieldLabel>
                    <button
                      type="button"
                      className="ml-auto text-sm underline-offset-2 hover:underline"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                  <Input id="password" type="password" required />
                </Field>
                <Field>
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </Field>
              </FieldGroup>
            </form>
            <div className="bg-muted relative hidden md:flex items-center justify-center p-6">
              <div className="relative w-full h-full">
                <Image
                  src={logo}
                  alt="Logo da Elmosys"
                  className="object-contain"
                  fill
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
