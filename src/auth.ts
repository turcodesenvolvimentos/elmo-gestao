import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/db/client";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e senha são obrigatórios");
        }

        const validationResult = loginSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });

        if (!validationResult.success) {
          throw new Error("Dados de login inválidos");
        }

        try {
          const { data: user, error } = await supabaseAdmin
            .from("users")
            .select("id, email, password_hash, name")
            .eq("email", credentials.email)
            .single();

          if (error || !user) {
            throw new Error("Email ou senha inválidos");
          }

          const password = credentials.password as string;
          const isPasswordValid = await bcrypt.compare(
            password,
            user.password_hash
          );

          if (!isPasswordValid) {
            throw new Error("Email ou senha inválidos");
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name || "",
          };
        } catch (error) {
          console.error("Erro na autenticação:", error);
          throw new Error("Erro ao autenticar usuário");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
});
