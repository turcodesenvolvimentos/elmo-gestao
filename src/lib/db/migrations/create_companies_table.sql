-- Criação da tabela de empresas
-- Empresas são cadastradas manualmente a partir de endereços dos pontos
-- Nota: Esta migration cria a tabela básica. A migration update_positions_and_companies_structure.sql
-- adicionará os campos vr_per_hour e cost_help_per_hour se não existirem
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Nome da empresa
  name TEXT NOT NULL,
  
  -- Endereço completo (único, usado para identificar a empresa nos pontos)
  address TEXT UNIQUE NOT NULL,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_companies_address ON companies(address);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_companies_updated_at();

-- Comentários para documentação
COMMENT ON TABLE companies IS 'Tabela de empresas cadastradas manualmente a partir de endereços';
COMMENT ON COLUMN companies.address IS 'Endereço completo (único) usado para identificar a empresa nos pontos';
COMMENT ON COLUMN companies.name IS 'Nome da empresa';
