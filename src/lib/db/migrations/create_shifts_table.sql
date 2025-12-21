-- Criação da tabela de escalas/turnos
-- Escalas definem os horários de trabalho para uma empresa

-- Remover tabela se existir (para garantir estrutura limpa)
DROP TABLE IF EXISTS shifts CASCADE;

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Nome da escala/turno
  name TEXT NOT NULL,
  
  -- Referência à empresa
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Horários de entrada e saída (primeiro turno - obrigatórios)
  entry1 TIME NOT NULL,
  exit1 TIME NOT NULL,
  
  -- Horários de entrada e saída (segundo turno - opcionais)
  entry2 TIME,
  exit2 TIME,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_shifts_company_id ON shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_name ON shifts(name);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_shifts_updated_at ON shifts;
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts
    FOR EACH ROW EXECUTE FUNCTION update_shifts_updated_at();

-- Comentários para documentação
COMMENT ON TABLE shifts IS 'Tabela de escalas/turnos de trabalho vinculados às empresas';
COMMENT ON COLUMN shifts.name IS 'Nome da escala/turno (ex: Turno Matutino, Turno Noturno)';
COMMENT ON COLUMN shifts.company_id IS 'Referência à empresa';
COMMENT ON COLUMN shifts.entry1 IS 'Horário de entrada do primeiro turno';
COMMENT ON COLUMN shifts.exit1 IS 'Horário de saída do primeiro turno';
COMMENT ON COLUMN shifts.entry2 IS 'Horário de entrada do segundo turno (opcional)';
COMMENT ON COLUMN shifts.exit2 IS 'Horário de saída do segundo turno (opcional)';
