import type { SupabaseClient } from "@supabase/supabase-js";


export const DEFAULT_POSITION_NAME = "Aj. Carga e Desc.";
export const DEFAULT_POSITION_HOUR_VALUE = 0;


export async function ensureDefaultPositionForCompany(
  supabase: SupabaseClient,
  companyId: string,
): Promise<string | null> {
  const { data: existing, error: selectError } = await supabase
    .from("positions")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", DEFAULT_POSITION_NAME)
    .maybeSingle();

  if (selectError) {
    console.error(
      "ensureDefaultPositionForCompany select error:",
      selectError,
    );
    return null;
  }
  if (existing?.id) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("positions")
    .insert({
      name: DEFAULT_POSITION_NAME,
      company_id: companyId,
      hour_value: DEFAULT_POSITION_HOUR_VALUE,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error(
      "ensureDefaultPositionForCompany insert error:",
      insertError,
    );
    return null;
  }
  return created?.id ?? null;
}
