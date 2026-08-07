-- Atestados: funcionário afastado por atestado médico a partir de um dia,
-- por uma quantidade de dias corridos (o primeiro dia já conta).
-- Ex.: start_date = 2026-08-07 com days = 2 cobre 07/08 e 08/08.
--
-- Efeito no cálculo: em dia útil (segunda a sexta, exceto feriado) o dia fecha
-- completando 8h normais. Sábado, domingo e feriado não geram crédito. O que o
-- funcionário efetivamente trabalhou é mantido; o atestado só injeta o que
-- falta para fechar a carga.

-- ATENCAO: NUNCA usar DROP TABLE aqui. As migrations reexecutam toda vez
-- que `yarn migrations` roda. Use CREATE TABLE IF NOT EXISTS para idempotência.

CREATE TABLE IF NOT EXISTS atestados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID do funcionário (mesmo identificador usado no boletim: solides id)
  employee_id TEXT NOT NULL,

  -- Nome do funcionário (para exibição na lista)
  employee_name TEXT NOT NULL,

  -- Primeiro dia do atestado (já conta na quantidade de dias)
  start_date DATE NOT NULL,

  -- Quantidade de dias corridos cobertos pelo atestado
  days INTEGER NOT NULL DEFAULT 1 CHECK (days >= 1),

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Um atestado por (funcionário, dia inicial)
  UNIQUE (employee_id, start_date)
);

CREATE INDEX IF NOT EXISTS idx_atestados_start_date ON atestados(start_date);
CREATE INDEX IF NOT EXISTS idx_atestados_employee_id ON atestados(employee_id);

COMMENT ON TABLE atestados IS 'Atestados médicos por funcionário, com dia inicial e quantidade de dias';
COMMENT ON COLUMN atestados.employee_id IS 'ID do funcionário (solides id), mesmo usado no boletim';
COMMENT ON COLUMN atestados.employee_name IS 'Nome do funcionário para exibição';
COMMENT ON COLUMN atestados.start_date IS 'Primeiro dia do atestado (conta na quantidade de dias)';
COMMENT ON COLUMN atestados.days IS 'Quantidade de dias corridos do atestado, incluindo o primeiro';
