-- Criação da tabela de aplicação de escalas aos funcionários
-- Registra quando uma escala foi aplicada a um funcionário

-- Remover tabela se existir (para garantir estrutura limpa)
DROP TABLE IF EXISTS escalas CASCADE;

CREATE TABLE escalas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência ao funcionário (UUID do employees)
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Referência à escala/turno
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  
  -- Data de início da aplicação da escala
  start_date DATE NOT NULL,
  
  -- Data de término (opcional, NULL significa que ainda está ativa)
  end_date DATE,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: evitar duplicatas exatas
  CONSTRAINT unique_employee_shift_start UNIQUE (employee_id, shift_id, start_date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_escalas_employee_id ON escalas(employee_id);
CREATE INDEX IF NOT EXISTS idx_escalas_shift_id ON escalas(shift_id);
CREATE INDEX IF NOT EXISTS idx_escalas_start_date ON escalas(start_date);
CREATE INDEX IF NOT EXISTS idx_escalas_end_date ON escalas(end_date);
CREATE INDEX IF NOT EXISTS idx_escalas_employee_start_date ON escalas(employee_id, start_date);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_escalas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_escalas_updated_at ON escalas;
CREATE TRIGGER update_escalas_updated_at BEFORE UPDATE ON escalas
    FOR EACH ROW EXECUTE FUNCTION update_escalas_updated_at();

-- Comentários para documentação
COMMENT ON TABLE escalas IS 'Tabela de aplicação de escalas aos funcionários';
COMMENT ON COLUMN escalas.employee_id IS 'Referência ao funcionário';
COMMENT ON COLUMN escalas.shift_id IS 'Referência à escala/turno aplicado';
COMMENT ON COLUMN escalas.start_date IS 'Data de início da aplicação da escala';
COMMENT ON COLUMN escalas.end_date IS 'Data de término (NULL significa que ainda está ativa)';
