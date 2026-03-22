export interface CustomHoliday {
  id: string;
  holiday_date: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CustomHolidaysResponse {
  holidays: CustomHoliday[];
}
