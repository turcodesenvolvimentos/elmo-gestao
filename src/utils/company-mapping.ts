const ADDRESS_TO_COMPANY: Record<string, string> = {
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

export function getCompanyFromPunch(punch: {
  locationIn?: { address?: string };
  locationOut?: { address?: string };
}): string {
  const addressIn = punch.locationIn?.address;
  const addressOut = punch.locationOut?.address;

  if (addressIn && ADDRESS_TO_COMPANY[addressIn]) {
    return ADDRESS_TO_COMPANY[addressIn];
  }

  if (addressOut && ADDRESS_TO_COMPANY[addressOut]) {
    return ADDRESS_TO_COMPANY[addressOut];
  }

  return "-";
}

export function getMappedCompanies(): string[] {
  return Object.values(ADDRESS_TO_COMPANY);
}
