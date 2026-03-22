-- Feriados adicionais (municipais, pontos facultativos, etc.) — escopo global do tenant
CREATE TABLE IF NOT EXISTS custom_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT custom_holidays_holiday_date_key UNIQUE (holiday_date)
);

CREATE INDEX IF NOT EXISTS idx_custom_holidays_holiday_date ON custom_holidays (holiday_date);

CREATE OR REPLACE FUNCTION update_custom_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_custom_holidays_updated_at ON custom_holidays;
CREATE TRIGGER update_custom_holidays_updated_at BEFORE UPDATE ON custom_holidays
    FOR EACH ROW EXECUTE FUNCTION update_custom_holidays_updated_at();

COMMENT ON TABLE custom_holidays IS 'Feriados cadastrados manualmente; complementam os feriados nacionais (date-holidays BR)';
