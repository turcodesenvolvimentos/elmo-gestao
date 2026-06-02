-- Cria a função padrão "Aj. Carga e Desc." em todas as empresas existentes
-- e atribui aos vínculos employee_companies que estão sem cargo.
--
-- Idempotente: pode ser rodada várias vezes sem duplicar.
-- 1. Para cada empresa que NÃO tem ainda uma position "Aj. Carga e Desc.",
--    cria uma com hour_value = 0.
-- 2. Backfill: todo employee_companies com position_id NULL recebe a
--    position "Aj. Carga e Desc." da empresa correspondente.

-- 1) Seed da position em empresas existentes
INSERT INTO positions (name, company_id, hour_value)
SELECT 'Aj. Carga e Desc.', c.id, 0
FROM companies c
WHERE NOT EXISTS (
  SELECT 1
  FROM positions p
  WHERE p.company_id = c.id
    AND p.name = 'Aj. Carga e Desc.'
);

-- 2) Backfill: vínculos sem position recebem a position padrão da empresa
UPDATE employee_companies ec
SET position_id = p.id
FROM positions p
WHERE ec.position_id IS NULL
  AND p.company_id = ec.company_id
  AND p.name = 'Aj. Carga e Desc.';
