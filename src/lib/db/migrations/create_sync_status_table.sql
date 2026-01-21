-- Criação da tabela de status de sincronização
-- Armazena a última vez que cada tipo de sincronização foi executada

CREATE TABLE IF NOT EXISTS sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL UNIQUE,
  last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida por tipo de sincronização
CREATE INDEX IF NOT EXISTS idx_sync_status_type ON sync_status(sync_type);

-- Comentários
COMMENT ON TABLE sync_status IS 'Tabela para armazenar o status das sincronizações com a API Sólides';
COMMENT ON COLUMN sync_status.sync_type IS 'Tipo de sincronização (ex: punches, employees)';
COMMENT ON COLUMN sync_status.last_sync_at IS 'Data/hora da última sincronização bem-sucedida';

-- Inserir registro inicial para sincronização de pontos
INSERT INTO sync_status (sync_type, last_sync_at)
VALUES ('punches', NOW() - INTERVAL '30 days')
ON CONFLICT (sync_type) DO NOTHING;
