-- Dispensas: funcionário dispensado em um dia específico.
-- Quando existe uma dispensa para (funcionário, dia), a falta desse dia
-- (que normalmente aparece em vermelho) passa a aparecer em amarelo no
-- boletim (tela e PDF) e na página de ponto.

-- ATENCAO: NUNCA usar DROP TABLE aqui. As migrations reexecutam toda vez
-- que `yarn migrations` roda. Use CREATE TABLE IF NOT EXISTS para idempotência.

CREATE TABLE IF NOT EXISTS dispensas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID do funcionário (mesmo identificador usado no boletim: solides id)
  employee_id TEXT NOT NULL,

  -- Nome do funcionário (para exibição na lista)
  employee_name TEXT NOT NULL,

  -- Dia da dispensa
  date DATE NOT NULL,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Uma dispensa por (funcionário, dia)
  UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_dispensas_date ON dispensas(date);
CREATE INDEX IF NOT EXISTS idx_dispensas_employee_id ON dispensas(employee_id);

COMMENT ON TABLE dispensas IS 'Funcionários dispensados em dias específicos';
COMMENT ON COLUMN dispensas.employee_id IS 'ID do funcionário (solides id), mesmo usado no boletim';
COMMENT ON COLUMN dispensas.employee_name IS 'Nome do funcionário para exibição';
COMMENT ON COLUMN dispensas.date IS 'Dia da dispensa';
