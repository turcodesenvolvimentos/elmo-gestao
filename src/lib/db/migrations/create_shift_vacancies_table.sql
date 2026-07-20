-- Vagas disponíveis por função (cargo) em cada escala/turno (shift)
-- Cada escala (ex: "Escala Manhã", "Escala Noite") guarda quantas vagas
-- tem por função. Ex: Escala Manhã = 3 vagas de Carregador, Escala Noite = 2.

-- ATENCAO: NUNCA usar DROP TABLE aqui. As migrations reexecutam toda vez
-- que `yarn migrations` roda. Use CREATE TABLE IF NOT EXISTS para idempotência.

CREATE TABLE IF NOT EXISTS shift_vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referência à escala/turno
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,

  -- Referência à função (cargo)
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,

  -- Quantidade de vagas configuradas
  vacancies INTEGER NOT NULL DEFAULT 0,

  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Uma linha por (escala, função)
  UNIQUE (shift_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_vacancies_shift_id ON shift_vacancies(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_vacancies_position_id ON shift_vacancies(position_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_shift_vacancies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_shift_vacancies_updated_at ON shift_vacancies;
CREATE TRIGGER update_shift_vacancies_updated_at BEFORE UPDATE ON shift_vacancies
    FOR EACH ROW EXECUTE FUNCTION update_shift_vacancies_updated_at();

COMMENT ON TABLE shift_vacancies IS 'Vagas disponíveis por função em cada escala/turno';
COMMENT ON COLUMN shift_vacancies.shift_id IS 'Referência à escala/turno';
COMMENT ON COLUMN shift_vacancies.position_id IS 'Referência à função (cargo)';
COMMENT ON COLUMN shift_vacancies.vacancies IS 'Quantidade de vagas configuradas para a função nessa escala';
