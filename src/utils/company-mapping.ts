export const ADDRESS_TO_COMPANY: Record<string, string> = {
  "Rodovia Duque de Caxias, 963, Reta - São Francisco do Sul, Santa Catarina":
    "Ourofértil 1",
  "Rodovia Duque de Caxias, 1400, Reta - São Francisco do Sul, Santa Catarina":
    "ExtraCargo",
  "Rua Pastor Antônio Dominoni, 28, Sao Jose Do Icarai - São Francisco do Sul, Santa Catarina":
    "Nátrio",
  "Estrada Abraão Antônio da Silva, 5911, Rocio Grande - São Francisco do Sul, Santa Catarina":
    "Fecoagro",
  "BR-280, KM 1, Do Paulas - São Francisco do Sul, Santa Catarina": "ATRP",
  "Rodovia Duque de Caxias, 890, Reta - São Francisco do Sul, Santa Catarina":
    "Ourofértil 2",
};

export const NO_MAPPED_COMPANY_LABEL = "Não escalado";

export function getCompanyNameFromRawAddresses(
  locationInAddress?: string | null,
  locationOutAddress?: string | null
): string {
  if (locationInAddress && ADDRESS_TO_COMPANY[locationInAddress]) {
    return ADDRESS_TO_COMPANY[locationInAddress];
  }
  if (locationOutAddress && ADDRESS_TO_COMPANY[locationOutAddress]) {
    return ADDRESS_TO_COMPANY[locationOutAddress];
  }
  return NO_MAPPED_COMPANY_LABEL;
}

export function getCompanyFromPunch(punch: {
  locationIn?: { address?: string };
  locationOut?: { address?: string };
}): string {
  return getCompanyNameFromRawAddresses(
    punch.locationIn?.address,
    punch.locationOut?.address
  );
}

export function getMappedCompanies(): string[] {
  return Object.values(ADDRESS_TO_COMPANY);
}
