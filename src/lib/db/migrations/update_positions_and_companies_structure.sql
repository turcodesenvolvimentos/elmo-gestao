-- Atualização da estrutura: VR e Ajuda de Custo são por empresa, não por cargo
-- Cargos terão apenas valor hora

-- 1. Adicionar campos VR e Ajuda de Custo na tabela companies (se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'vr_per_hour'
    ) THEN
        ALTER TABLE companies ADD COLUMN vr_per_hour DECIMAL(10, 2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'cost_help_per_hour'
    ) THEN
        ALTER TABLE companies ADD COLUMN cost_help_per_hour DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- 2. Adicionar campo valor hora na tabela positions (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'positions' AND column_name = 'hour_value'
    ) THEN
        ALTER TABLE positions ADD COLUMN hour_value DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;

-- 3. Remover campos VR e Ajuda de Custo da tabela positions (se existirem)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'positions' AND column_name = 'vr_per_hour'
    ) THEN
        ALTER TABLE positions DROP COLUMN vr_per_hour;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'positions' AND column_name = 'cost_help_per_hour'
    ) THEN
        ALTER TABLE positions DROP COLUMN cost_help_per_hour;
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN companies.vr_per_hour IS 'Valor do VR (Vale Refeição) por hora da empresa';
COMMENT ON COLUMN companies.cost_help_per_hour IS 'Ajuda de Custo por hora da empresa';
COMMENT ON COLUMN positions.hour_value IS 'Valor hora do cargo';
