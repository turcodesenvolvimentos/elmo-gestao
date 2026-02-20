-- Criação da tabela de pontos (punches) sincronizados da Sólides
CREATE TABLE IF NOT EXISTS punches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ID único do ponto na Sólides (para evitar duplicatas)
  solides_id INTEGER UNIQUE NOT NULL,
  
  -- Data do ponto
  date DATE NOT NULL,
  
  -- Horários de entrada e saída
  date_in TIMESTAMP WITH TIME ZONE,
  date_out TIMESTAMP WITH TIME ZONE,
  
  -- Localizações (endereços)
  location_in_address TEXT,
  location_out_address TEXT,
  
  -- Dados do funcionário (denormalizados para facilitar queries)
  employee_id INTEGER NOT NULL,
  employee_name TEXT NOT NULL,
  
  -- Dados da empresa (denormalizados)
  employer_name TEXT,
  
  -- Status do ponto na Sólides
  status TEXT NOT NULL CHECK (status IN ('APPROVED', 'PENDING', 'REPROVED')),
  
  -- Motivo de ajuste (atestado): work = Acidente/Doença do trabalho, non_work = não relacionada ao trabalho
  adjust BOOLEAN NOT NULL DEFAULT FALSE,
  adjustment_reason_description TEXT,
  adjustment_reason_tipo VARCHAR(20) CHECK (adjustment_reason_tipo IS NULL OR adjustment_reason_tipo IN ('work', 'non_work')),
  
  -- Metadados de controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_punches_solides_id ON punches(solides_id);
CREATE INDEX IF NOT EXISTS idx_punches_employee_id ON punches(employee_id);
CREATE INDEX IF NOT EXISTS idx_punches_date ON punches(date);
CREATE INDEX IF NOT EXISTS idx_punches_status ON punches(status);
CREATE INDEX IF NOT EXISTS idx_punches_employee_date ON punches(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_punches_date_range ON punches(date DESC);

-- Índice composto para queries comuns (funcionário + período + status)
CREATE INDEX IF NOT EXISTS idx_punches_employee_date_status ON punches(employee_id, date DESC, status);
CREATE INDEX IF NOT EXISTS idx_punches_adjustment_reason_tipo ON punches(adjustment_reason_tipo) WHERE adjustment_reason_tipo IS NOT NULL;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_punches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_punches_updated_at ON punches;
CREATE TRIGGER update_punches_updated_at BEFORE UPDATE ON punches
    FOR EACH ROW EXECUTE FUNCTION update_punches_updated_at();

-- Comentários para documentação
COMMENT ON TABLE punches IS 'Tabela de pontos sincronizados da API da Sólides';
COMMENT ON COLUMN punches.solides_id IS 'ID único do ponto na Sólides (usado para evitar duplicatas)';
COMMENT ON COLUMN punches.date IS 'Data do ponto (normalizada para facilitar queries)';
COMMENT ON COLUMN punches.synced_at IS 'Data/hora da última sincronização da Sólides';
COMMENT ON COLUMN punches.status IS 'Status do ponto: APPROVED (aprovado), PENDING (pendente), REPROVED (reprovado)';
COMMENT ON COLUMN punches.adjust IS 'Indica se o ponto foi ajustado (ex.: com atestado) na Solides';
COMMENT ON COLUMN punches.adjustment_reason_description IS 'Descrição do motivo de ajuste vinda da API Solides';
COMMENT ON COLUMN punches.adjustment_reason_tipo IS 'Classificação: work = Acidente/Doença do trabalho, non_work = não relacionada ao trabalho';
