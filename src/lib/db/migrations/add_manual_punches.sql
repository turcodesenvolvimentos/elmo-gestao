-- Lançamento manual de batidas: origem e matrícula da Sólides opcional.
-- Permite registrar ponto direto no sistema, sem depender da API da Sólides.

-- Batida lançada à mão não tem id na Sólides. O UNIQUE continua valendo:
-- no Postgres, unique aceita vários NULLs.
ALTER TABLE punches
  ALTER COLUMN solides_id DROP NOT NULL;

ALTER TABLE punches
  ADD COLUMN IF NOT EXISTS origem VARCHAR(10) NOT NULL DEFAULT 'SOLIDES';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'punches_origem_check'
  ) THEN
    ALTER TABLE punches
      ADD CONSTRAINT punches_origem_check
      CHECK (origem IN ('SOLIDES', 'MANUAL'));
  END IF;
END $$;

-- Quem lançou e quando, para auditoria de folha de pagamento.
ALTER TABLE punches
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_punches_origem ON punches(origem);
CREATE INDEX IF NOT EXISTS idx_punches_manual_employee_date
  ON punches(employee_id, date) WHERE origem = 'MANUAL';

COMMENT ON COLUMN punches.origem IS 'SOLIDES = veio da API; MANUAL = lançada no sistema';
COMMENT ON COLUMN punches.solides_id IS 'ID do ponto na Sólides. Nulo em batida lançada manualmente.';
COMMENT ON COLUMN punches.created_by IS 'Usuário que lançou a batida manual';
