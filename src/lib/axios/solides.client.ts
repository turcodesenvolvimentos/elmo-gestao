import axios, { AxiosError, AxiosInstance } from "axios";
import { handleSolidesError } from "./error-handler";

const SOLIDES_ENDPOINTS = {
  employer: "https://employer.tangerino.com.br/",
  api: "https://api.tangerino.com.br/api/",
} as const;

type SolidesEndpoint = keyof typeof SOLIDES_ENDPOINTS;

export function createSolidesClient(endpoint: SolidesEndpoint): AxiosInstance {
  const client = axios.create({
    baseURL: SOLIDES_ENDPOINTS[endpoint],
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
      Authorization: process.env.SOLIDES_API_TOKEN,
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const solidesError = handleSolidesError(error);
      return Promise.reject(solidesError);
    }
  );

  return client;
}

export const solidesEmployerClient = createSolidesClient("employer");
export const solidesApiClient = createSolidesClient("api");

export default solidesEmployerClient;
