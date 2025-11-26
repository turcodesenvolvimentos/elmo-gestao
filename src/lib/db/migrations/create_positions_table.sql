-- Criação da tabela de cargos
-- Cargos são vinculados às empresas
-- Nota: Esta migration cria a tabela básica. A migration update_positions_and_companies_structure.sql
-- fará as alterações necessárias para mover VR/Ajuda de Custo para empresas e adicionar hour_value
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Nome do cargo
  name TEXT NOT NULL,
  
  -- Foreign key para empresa
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_positions_company_id ON positions(company_id);
CREATE INDEX IF NOT EXISTS idx_positions_name ON positions(name);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_positions_updated_at();

-- Comentários para documentação
COMMENT ON TABLE positions IS 'Tabela de cargos vinculados às empresas';
COMMENT ON COLUMN positions.name IS 'Nome do cargo';
COMMENT ON COLUMN positions.company_id IS 'Referência à empresa';
