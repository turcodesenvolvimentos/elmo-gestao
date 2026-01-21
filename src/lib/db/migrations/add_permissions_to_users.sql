-- Adicionar coluna de permissões na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Criar índice para busca por permissões (usando GIN para arrays)
CREATE INDEX IF NOT EXISTS idx_users_permissions ON users USING GIN(permissions);

-- Função helper para verificar se usuário tem uma permissão específica
CREATE OR REPLACE FUNCTION user_has_permission(user_permissions TEXT[], required_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Se o array de permissões contém a permissão requerida, retorna true
  RETURN required_permission = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comentário para documentação
COMMENT ON COLUMN users.permissions IS 'Array de permissões do usuário. Valores possíveis: admin (acesso total), users, companies, employees, ponto, vale_alimentacao, boletim, escalas';
