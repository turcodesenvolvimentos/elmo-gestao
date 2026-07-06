-- Adiciona o campo CNPJ (opcional) à tabela de empresas
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cnpj TEXT;

COMMENT ON COLUMN companies.cnpj IS 'CNPJ da empresa (opcional, apenas dígitos ou formatado)';
