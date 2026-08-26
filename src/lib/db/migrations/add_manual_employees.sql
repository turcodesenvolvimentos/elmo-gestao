-- Cadastro manual de funcionários: origem, matrícula própria e status local.
-- Permite operar sem a API da Sólides, cadastrando funcionário direto no sistema.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS origem VARCHAR(10) NOT NULL DEFAULT 'SOLIDES';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_origem_check'
  ) THEN
    ALTER TABLE employees
      ADD CONSTRAINT employees_origem_check
      CHECK (origem IN ('SOLIDES', 'MANUAL'));
  END IF;
END $$;

-- Marcação local de ativo/inativo. NULL = segue o que a Sólides informou.
-- A sincronização NUNCA escreve nesta coluna, então a marcação sobrevive.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS ativo_override BOOLEAN;

-- Matrícula dos funcionários cadastrados no sistema. Começa em 900.000.000
-- para nunca colidir com os IDs da Sólides (maior observado: ~6,9 milhões).
-- O limite é o máximo do INTEGER, 2.147.483.647.
CREATE SEQUENCE IF NOT EXISTS employees_matricula_manual_seq
  AS INTEGER
  START WITH 900000000
  MINVALUE 900000000
  MAXVALUE 2147483647
  INCREMENT BY 1;

CREATE OR REPLACE FUNCTION proxima_matricula_manual()
RETURNS INTEGER
LANGUAGE sql
AS $$
  SELECT nextval('employees_matricula_manual_seq')::INTEGER;
$$;

-- Funcao em schema public vira endpoint RPC automaticamente no Supabase, e a
-- chave anonima e publica. Revogar de PUBLIC tambem: anon e authenticated
-- herdam dele, entao revogar so dos dois nao surte efeito. A aplicacao chama
-- com a service role key, que passa por cima destes grants.
REVOKE EXECUTE ON FUNCTION proxima_matricula_manual() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_employees_origem ON employees(origem);
CREATE INDEX IF NOT EXISTS idx_employees_ativo_override
  ON employees(ativo_override) WHERE ativo_override IS NOT NULL;

COMMENT ON COLUMN employees.origem IS 'SOLIDES = veio da API; MANUAL = cadastrado no sistema';
COMMENT ON COLUMN employees.ativo_override IS 'Ativo/inativo definido no sistema. NULL = usa o campo fired vindo da Sólides. A sincronização nunca escreve aqui.';
COMMENT ON SEQUENCE employees_matricula_manual_seq IS 'Matrícula dos funcionários cadastrados manualmente, a partir de 900.000.000';
