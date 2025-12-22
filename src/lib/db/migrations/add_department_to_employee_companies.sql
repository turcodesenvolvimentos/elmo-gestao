-- Adiciona campo department (setor) na tabela employee_companies
-- Permite vincular um setor específico a um funcionário em uma empresa
ALTER TABLE employee_companies
ADD COLUMN IF NOT EXISTS department TEXT;

-- Índice para performance em queries que filtram por setor
CREATE INDEX IF NOT EXISTS idx_employee_companies_department ON employee_companies(department);

-- Comentário para documentação
COMMENT ON COLUMN employee_companies.department IS 'Setor/departamento do funcionário na empresa (ex: Produção, Administrativo, RH)';
