-- Criar bucket no Supabase Storage para boletins (executar manualmente no Supabase Dashboard ou via API)
-- Nome do bucket: 'boletim-exports'
-- Público: false (apenas usuários autenticados)

-- Criar tabela para armazenar histórico de exportações de boletim
CREATE TABLE IF NOT EXISTS boletim_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamento com empresa
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,

  -- Período do boletim
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Informações do arquivo PDF
  pdf_storage_path TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  file_size_bytes INTEGER,

  -- Metadados importantes do boletim
  total_hours DECIMAL(10,2),
  total_value DECIMAL(10,2),
  total_employees INTEGER,
  total_records INTEGER,

  -- Edições manuais feitas antes de exportar (armazena as modificações temporárias)
  manual_edits JSONB DEFAULT '{}'::jsonb,

  -- Filtros aplicados no momento da exportação
  filters_applied JSONB DEFAULT '{}'::jsonb,

  -- Auditoria
  exported_at TIMESTAMP DEFAULT NOW(),
  exported_by UUID,

  -- Índices para melhor performance
  CONSTRAINT boletim_exports_dates_check CHECK (end_date >= start_date)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_boletim_exports_company_id ON boletim_exports(company_id);
CREATE INDEX IF NOT EXISTS idx_boletim_exports_dates ON boletim_exports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_boletim_exports_exported_at ON boletim_exports(exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_boletim_exports_company_dates ON boletim_exports(company_id, start_date, end_date);

-- Comentários para documentação
COMMENT ON TABLE boletim_exports IS 'Histórico de boletins de ponto exportados';
COMMENT ON COLUMN boletim_exports.manual_edits IS 'Edições manuais feitas nos registros antes da exportação (formato: {employee_id-date: {...edits}})';
COMMENT ON COLUMN boletim_exports.filters_applied IS 'Filtros aplicados no momento da exportação (funcionário, função, setor, dia)';
