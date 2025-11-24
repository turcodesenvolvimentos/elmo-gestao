-- Criação da tabela de funcionários sincronizados da Sólides
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ID único do funcionário na Sólides (para evitar duplicatas)
  solides_id INTEGER UNIQUE NOT NULL,
  
  -- ID externo na Sólides
  external_id TEXT,
  
  -- Dados pessoais
  name TEXT NOT NULL,
  social_name TEXT,
  cpf TEXT,
  email TEXT,
  phone TEXT,
  pis TEXT,
  gender TEXT CHECK (gender IN ('FEMININO', 'MASCULINO')),
  
  -- Datas
  admission_date DATE,
  resignation_date DATE,
  
  -- Status
  fired BOOLEAN DEFAULT FALSE,
  status INTEGER,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_employees_solides_id ON employees(solides_id);
CREATE INDEX IF NOT EXISTS idx_employees_external_id ON employees(external_id);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_cpf ON employees(cpf);
CREATE INDEX IF NOT EXISTS idx_employees_fired ON employees(fired);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_employees_updated_at();

-- Comentários para documentação
COMMENT ON TABLE employees IS 'Tabela de funcionários sincronizados da API da Sólides';
COMMENT ON COLUMN employees.solides_id IS 'ID único do funcionário na Sólides (usado para evitar duplicatas)';
COMMENT ON COLUMN employees.synced_at IS 'Data/hora da última sincronização da Sólides';
