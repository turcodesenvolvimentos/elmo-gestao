-- Adiciona campo position_id na tabela employee_companies
-- Permite vincular um cargo específico a um funcionário em uma empresa
ALTER TABLE employee_companies
ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_employee_companies_position_id ON employee_companies(position_id);

-- Comentário para documentação
COMMENT ON COLUMN employee_companies.position_id IS 'Referência ao cargo do funcionário na empresa (opcional)';
