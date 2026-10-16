-- Atestados: tipo de afastamento, opção de considerar fim de semana e feriado
-- e opção de não cobrar do cliente.
--
-- considerar_fds_feriado = true faz sábado, domingo e feriado cobertos pelo
-- atestado também gerarem crédito de horas.
-- nao_cobrar_cliente = true mantém o atestado no ponto, mas no boletim o dia
-- fica marcado como atestado com 0h e sem valor.

-- ATENCAO: NUNCA usar DROP aqui. As migrations reexecutam toda vez que
-- `yarn migrations` roda. Use IF NOT EXISTS para idempotência.

ALTER TABLE atestados
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'atestado_medico';

ALTER TABLE atestados
  ADD COLUMN IF NOT EXISTS considerar_fds_feriado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE atestados
  ADD COLUMN IF NOT EXISTS nao_cobrar_cliente BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN atestados.tipo IS 'Tipo de afastamento (atestado_medico, declaracao_comparecimento, licenca_nojo, licenca_gala, licenca_paternidade, outro)';
COMMENT ON COLUMN atestados.considerar_fds_feriado IS 'Quando true, sábado, domingo e feriado cobertos pelo atestado também geram crédito de horas';
COMMENT ON COLUMN atestados.nao_cobrar_cliente IS 'Quando true, o atestado aparece no ponto mas não é cobrado no boletim (0h, sem valor)';
