"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import logo from "@/assets/logo.png";
import Image from "next/image";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Por favor, preencha o campo de email";
    }

    if (!password.trim()) {
      errors.password = "Por favor, preencha o campo de senha";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email ou senha inválidos");
        setIsLoading(false);
        return;
      }

      router.push("/home");
      router.refresh();
    } catch (error) {
      console.error("Erro no login:", error);
      setError("Erro ao conectar com o servidor");
      setIsLoading(false);
    }
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
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationErrors.email) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          email: undefined,
                        }));
                      }
                    }}
                    disabled={isLoading}
                  />
                  {validationErrors.email && (
                    <Alert
                      variant="destructive"
                      className="mt-1 border-0 rounded-none p-0 items-center [&>svg]:translate-y-0"
                    >
                      <AlertCircleIcon className="size-3" />
                      <AlertDescription className="text-xs !flex !items-center">
                        {validationErrors.email}
                      </AlertDescription>
                    </Alert>
                  )}
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
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }
                    }}
                    disabled={isLoading}
                  />
                  {validationErrors.password && (
                    <Alert
                      variant="destructive"
                      className="mt-1 border-0 rounded-none p-0 items-center [&>svg]:translate-y-0"
                    >
                      <AlertCircleIcon className="size-3" />
                      <AlertDescription className="text-xs !flex !items-center">
                        {validationErrors.password}
                      </AlertDescription>
                    </Alert>
                  )}
                </Field>
                {error && (
                  <Alert
                    variant="destructive"
                    className="border-0 rounded-none p-0 items-center [&>svg]:translate-y-0"
                  >
                    <AlertCircleIcon className="size-3" />
                    <AlertDescription className="text-xs !flex !items-center">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
                <Field>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Login"}
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
