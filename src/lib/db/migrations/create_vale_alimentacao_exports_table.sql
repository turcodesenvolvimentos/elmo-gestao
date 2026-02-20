-- Criar bucket no Supabase Storage para relatórios de vale alimentação (executar manualmente no Supabase Dashboard ou via API)
-- Nome do bucket: 'vale-alimentacao-exports'
-- Público: false (apenas usuários autenticados)

-- Criar tabela para armazenar histórico de exportações de relatórios de vale alimentação
CREATE TABLE IF NOT EXISTS vale_alimentacao_exports (
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
  total_vr DECIMAL(10,2),
  total_cost_help DECIMAL(10,2),
  total_employees INTEGER,
  total_records INTEGER,

  -- Filtros aplicados no momento da exportação
  filters_applied JSONB DEFAULT '{}'::jsonb,

  -- Auditoria
  exported_at TIMESTAMP DEFAULT NOW(),
  exported_by UUID,

  -- Constraint
  CONSTRAINT vale_alimentacao_exports_dates_check CHECK (end_date >= start_date)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_vale_alimentacao_exports_employee_id ON vale_alimentacao_exports(employee_id);
CREATE INDEX IF NOT EXISTS idx_vale_alimentacao_exports_dates ON vale_alimentacao_exports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vale_alimentacao_exports_exported_at ON vale_alimentacao_exports(exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_vale_alimentacao_exports_employee_dates ON vale_alimentacao_exports(employee_id, start_date, end_date);

-- Comentários para documentação
COMMENT ON TABLE vale_alimentacao_exports IS 'Histórico de relatórios de vale alimentação exportados';
COMMENT ON COLUMN vale_alimentacao_exports.filters_applied IS 'Filtros aplicados no momento da exportação (funcionário, período)';
