-- Criação da tabela de vale alimentação e ajuda de custo por funcionário/data
CREATE TABLE IF NOT EXISTS food_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência ao funcionário (ID da Sólides)
  employee_id INTEGER NOT NULL,
  
  -- Data do trabalho
  work_date DATE NOT NULL,
  
  -- Empresa (opcional, para referência)
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Flags de ativação
  vale_alimentacao BOOLEAN DEFAULT false,
  ajuda_custo BOOLEAN DEFAULT false,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: um registro único por funcionário/data
  UNIQUE(employee_id, work_date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_food_vouchers_employee_id ON food_vouchers(employee_id);
CREATE INDEX IF NOT EXISTS idx_food_vouchers_work_date ON food_vouchers(work_date);
CREATE INDEX IF NOT EXISTS idx_food_vouchers_employee_date ON food_vouchers(employee_id, work_date);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_food_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_food_vouchers_updated_at ON food_vouchers;
CREATE TRIGGER update_food_vouchers_updated_at BEFORE UPDATE ON food_vouchers
    FOR EACH ROW EXECUTE FUNCTION update_food_vouchers_updated_at();

-- Comentários para documentação
COMMENT ON TABLE food_vouchers IS 'Tabela para controle de vale alimentação e ajuda de custo por funcionário e data';
COMMENT ON COLUMN food_vouchers.employee_id IS 'ID do funcionário na Sólides';
COMMENT ON COLUMN food_vouchers.work_date IS 'Data do trabalho';
COMMENT ON COLUMN food_vouchers.vale_alimentacao IS 'Indica se o vale alimentação está ativado para este dia';
COMMENT ON COLUMN food_vouchers.ajuda_custo IS 'Indica se a ajuda de custo está ativada para este dia';
