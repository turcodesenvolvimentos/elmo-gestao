import { CreateUserInput, UpdateUserInput } from "@/lib/validations/users";

export interface User {
  id: string;
  email: string;
  name: string;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface UsersResponse {
  users: User[];
  total: number;
}

export async function fetchUsers(): Promise<UsersResponse> {
  const response = await fetch("/api/users");

  if (!response.ok) {
    throw new Error("Erro ao buscar usuários");
  }

  return response.json();
}

export async function fetchUserById(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao buscar usuário");
  }

  return response.json();
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const response = await fetch("/api/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao criar usuário");
  }

  return response.json();
}

export async function updateUser(
  id: string,
  data: UpdateUserInput
): Promise<User> {
  const response = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao atualizar usuário");
  }

  return response.json();
}

export async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`/api/users/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Erro ao excluir usuário");
  }
}
