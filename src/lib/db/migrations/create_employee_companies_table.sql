-- Criação da tabela de relacionamento muitos-para-muitos entre funcionários e empresas
-- Um funcionário pode trabalhar em uma ou mais empresas
CREATE TABLE IF NOT EXISTS employee_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: um funcionário não pode estar vinculado à mesma empresa duas vezes
  UNIQUE(employee_id, company_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_employee_companies_employee_id ON employee_companies(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_companies_company_id ON employee_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_companies_employee_company ON employee_companies(employee_id, company_id);

-- Comentários para documentação
COMMENT ON TABLE employee_companies IS 'Tabela de relacionamento muitos-para-muitos entre funcionários e empresas';
COMMENT ON COLUMN employee_companies.employee_id IS 'Referência ao funcionário';
COMMENT ON COLUMN employee_companies.company_id IS 'Referência à empresa';
