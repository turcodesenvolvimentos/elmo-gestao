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
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch (e) {
      // Se não conseguir parsear JSON, usar mensagem padrão
      throw new Error(`Erro ao criar usuário: ${response.status} ${response.statusText}`);
    }
    
    // Se houver detalhes de validação, incluir na mensagem
    if (errorData.details && Array.isArray(errorData.details)) {
      const validationErrors = errorData.details
        .map((err: any) => {
          const path = err.path?.join(".") || "dados";
          return `${path}: ${err.message}`;
        })
        .join(", ");
      throw new Error(
        errorData.error 
          ? `${errorData.error} - ${validationErrors}`
          : `Erro de validação: ${validationErrors}`
      );
    }
    
    throw new Error(errorData.error || `Erro ao criar usuário: ${response.status}`);
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
