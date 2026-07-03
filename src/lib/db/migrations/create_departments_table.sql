-- Criação da tabela de setores
-- Setores são vinculados às empresas (lista gerenciada por empresa)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nome do setor
  name TEXT NOT NULL,

  -- Foreign key para empresa
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- Evita setores duplicados na mesma empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_company_name
  ON departments(company_id, lower(name));

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_departments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_departments_updated_at();

-- Comentários para documentação
COMMENT ON TABLE departments IS 'Tabela de setores vinculados às empresas';
COMMENT ON COLUMN departments.name IS 'Nome do setor';
COMMENT ON COLUMN departments.company_id IS 'Referência à empresa';
