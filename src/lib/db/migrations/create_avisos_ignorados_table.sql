-- Avisos ignorados: dia de um funcionário que foi marcado manualmente para
-- não aparecer mais na aba "Verificação" da tela de ponto. O registro guarda
-- apenas (funcionário, dia); todos os avisos daquele dia ficam ocultos e
-- podem ser restaurados pela aba "Ignorados".

-- ATENCAO: NUNCA usar DROP TABLE aqui. As migrations reexecutam toda vez
-- que `yarn migrations` roda. Use CREATE TABLE IF NOT EXISTS para idempotência.

CREATE TABLE IF NOT EXISTS avisos_ignorados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID do funcionário (mesmo identificador usado no boletim: solides id)
  employee_id TEXT NOT NULL,

  -- Nome do funcionário (para exibição na lista)
  employee_name TEXT NOT NULL,

  -- Dia cujos avisos foram ignorados
  date DATE NOT NULL,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Um registro por (funcionário, dia)
  UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_avisos_ignorados_date ON avisos_ignorados(date);
CREATE INDEX IF NOT EXISTS idx_avisos_ignorados_employee_id ON avisos_ignorados(employee_id);

COMMENT ON TABLE avisos_ignorados IS 'Dias cujos avisos de verificação de ponto foram ocultados manualmente';
COMMENT ON COLUMN avisos_ignorados.employee_id IS 'ID do funcionário (solides id), mesmo usado no boletim';
COMMENT ON COLUMN avisos_ignorados.employee_name IS 'Nome do funcionário para exibição';
COMMENT ON COLUMN avisos_ignorados.date IS 'Dia cujos avisos foram ignorados';
