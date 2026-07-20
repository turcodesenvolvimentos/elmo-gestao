export interface ShiftVacancy {
  position_id: string;
  position_name: string | null;
  vacancies: number;
}

export interface ShiftVacanciesResponse {
  vacancies: ShiftVacancy[];
}

export interface ShiftVacancyInput {
  position_id: string;
  vacancies: number | null; // null remove a configuração da função
}
