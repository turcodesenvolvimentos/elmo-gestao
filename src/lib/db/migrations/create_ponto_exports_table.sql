-- Criar bucket no Supabase Storage para relatórios de ponto (executar manualmente no Supabase Dashboard ou via API)
-- Nome do bucket: 'ponto-exports'
-- Público: false (apenas usuários autenticados)

-- Criar tabela para armazenar histórico de exportações de relatórios de ponto
CREATE TABLE IF NOT EXISTS ponto_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações do funcionário (opcional, pode ser null se for relatório geral)
  employee_id INTEGER,
  employee_name TEXT,

  -- Período do relatório
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Informações do arquivo PDF
  pdf_storage_path TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  file_size_bytes INTEGER,

  -- Metadados importantes do relatório
  total_hours DECIMAL(10,2),
  total_normal_hours DECIMAL(10,2),
  total_night_additional DECIMAL(10,2),
  total_extra_50 DECIMAL(10,2),
  total_extra_100 DECIMAL(10,2),
  total_records INTEGER,

  -- Filtros aplicados no momento da exportação
  filters_applied JSONB DEFAULT '{}'::jsonb,

  -- Auditoria
  exported_at TIMESTAMP DEFAULT NOW(),
  exported_by UUID,

  -- Constraint
  CONSTRAINT ponto_exports_dates_check CHECK (end_date >= start_date)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_ponto_exports_employee_id ON ponto_exports(employee_id);
CREATE INDEX IF NOT EXISTS idx_ponto_exports_dates ON ponto_exports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ponto_exports_exported_at ON ponto_exports(exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_ponto_exports_employee_dates ON ponto_exports(employee_id, start_date, end_date);

-- Comentários para documentação
COMMENT ON TABLE ponto_exports IS 'Histórico de relatórios de ponto exportados';
COMMENT ON COLUMN ponto_exports.filters_applied IS 'Filtros aplicados no momento da exportação (funcionário, empresa, status, período)';
