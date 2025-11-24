-- Atualização da tabela de pontos para incluir foreign keys
-- Esta migration deve ser executada APÓS criar as tabelas de employees e companies

-- Verificar se a tabela employees existe antes de adicionar foreign key
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
    -- Adicionar coluna para referência ao funcionário (UUID do employees)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'punches' AND column_name = 'employee_uuid'
    ) THEN
      ALTER TABLE punches 
        ADD COLUMN employee_uuid UUID REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Verificar se a tabela companies existe antes de adicionar foreign key
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'companies') THEN
    -- Adicionar coluna para referência à empresa (UUID do companies)
    -- A empresa será identificada pelo endereço do ponto
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'punches' AND column_name = 'company_id'
    ) THEN
      ALTER TABLE punches 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Manter employee_id (INTEGER) e employee_name para compatibilidade e queries rápidas
-- Mas agora também temos a referência UUID para integridade referencial

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_punches_employee_uuid ON punches(employee_uuid);
CREATE INDEX IF NOT EXISTS idx_punches_company_id ON punches(company_id);
CREATE INDEX IF NOT EXISTS idx_punches_location_in_address ON punches(location_in_address);
CREATE INDEX IF NOT EXISTS idx_punches_location_out_address ON punches(location_out_address);

-- Comentários para documentação
COMMENT ON COLUMN punches.employee_uuid IS 'Referência UUID ao funcionário na tabela employees';
COMMENT ON COLUMN punches.company_id IS 'Referência à empresa identificada pelo endereço do ponto';
COMMENT ON COLUMN punches.employee_id IS 'ID do funcionário na Sólides (mantido para compatibilidade)';
COMMENT ON COLUMN punches.employee_name IS 'Nome do funcionário (denormalizado para queries rápidas)';
