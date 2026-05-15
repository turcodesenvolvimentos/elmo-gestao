"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircleIcon, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import logo from "@/assets/logo.png";
import Image from "next/image";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLogged, setKeepLogged] = useState(true);
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
    if (!email.trim()) errors.email = "Por favor, preencha o campo de email";
    if (!password.trim()) errors.password = "Por favor, preencha o campo de senha";

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        keepLogged: keepLogged ? "true" : "false",
        redirect: false,
      });
      if (result?.error) {
        setError("Email ou senha inválidos");
        setIsLoading(false);
        return;
      }
      router.push("/home");
      router.refresh();
    } catch (err) {
      console.error("Erro no login:", err);
      setError("Erro ao conectar com o servidor");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-muted relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,theme(colors.green.100),transparent_60%)]"
      />

      <div className="relative w-full max-w-sm md:max-w-4xl">
        <div className="mb-6 flex justify-center md:hidden">
          <div className="relative h-28 w-28">
            <Image src={logo} alt="Logo da Elmosys" className="object-contain" fill />
          </div>
        </div>

        <Card className="overflow-hidden p-0 shadow-xl">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="relative hidden bg-gradient-to-br from-green-700 via-green-800 to-green-900 p-8 text-white md:flex md:flex-col md:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <Image src={logo} alt="" width={24} height={24} className="object-contain" />
                </div>
                <span className="text-base font-semibold tracking-tight">Elmosys</span>
              </div>

              <div className="grid flex-1 place-items-center py-8">
                <Image
                  src={logo}
                  alt="Logo da Elmosys"
                  width={360}
                  height={360}
                  className="object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
                  priority
                />
              </div>

              <h2 className="text-center text-2xl font-semibold leading-tight tracking-tight">
                Gestão operacional com clareza.
              </h2>
            </div>

            <form className="p-6 md:p-10" onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
                  <p className="text-muted-foreground text-sm">
                    Use seu email corporativo para acessar.
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
                        setValidationErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    disabled={isLoading}
                  />
                  {validationErrors.email && (
                    <Alert
                      variant="destructive"
                      className="mt-1 items-center rounded-none border-0 p-0 [&>svg]:translate-y-0"
                    >
                      <AlertCircleIcon className="size-3" />
                      <AlertDescription className="!flex !items-center text-xs">
                        {validationErrors.email}
                      </AlertDescription>
                    </Alert>
                  )}
                </Field>

                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="password">Senha</FieldLabel>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="ml-auto text-xs font-medium text-green-800 underline-offset-2 hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Recuperação de senha</DialogTitle>
                          <DialogDescription>
                            Para recuperar ou redefinir sua senha, entre em contato
                            com o responsável pelos usuários do sistema na sua empresa.
                          </DialogDescription>
                        </DialogHeader>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (validationErrors.password) {
                        setValidationErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    disabled={isLoading}
                  />
                  {validationErrors.password && (
                    <Alert
                      variant="destructive"
                      className="mt-1 items-center rounded-none border-0 p-0 [&>svg]:translate-y-0"
                    >
                      <AlertCircleIcon className="size-3" />
                      <AlertDescription className="!flex !items-center text-xs">
                        {validationErrors.password}
                      </AlertDescription>
                    </Alert>
                  )}
                </Field>

                <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={keepLogged}
                    onCheckedChange={(v) => setKeepLogged(Boolean(v))}
                  />
                  Manter conectado neste dispositivo
                </label>

                {error && (
                  <Alert
                    variant="destructive"
                    className="items-center rounded-none border-0 p-0 [&>svg]:translate-y-0"
                  >
                    <AlertCircleIcon className="size-3" />
                    <AlertDescription className="!flex !items-center text-xs">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <Field>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-800 hover:bg-green-900"
                  >
                    {isLoading ? "Entrando..." : (
                      <>
                        Entrar <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </Field>

                <p className="text-muted-foreground/80 text-center text-xs">
                  Problemas para acessar? Fale com o administrador do seu time.
                </p>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}