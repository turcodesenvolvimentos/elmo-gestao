import axios, { AxiosError, AxiosInstance } from "axios";
import { handleSolidesError } from "./error-handler";

// Em 14/09/2026 o modulo de batidas saiu de api.tangerino.com.br/api/ e
// passou a responder em apis.tangerino.com.br/ (host no plural, sem o /api/
// no caminho). O endereco antigo devolve 404 do nginx, sem aplicacao por
// tras. Endereco novo informado pelo suporte da Solides no atendimento
// #2631903 e verificado em 17/09/2026: responde 200 com
// x-application-context: punch-service:prod:8080, mesmo formato de resposta.
// O host de funcionarios (employer) nao mudou.
const SOLIDES_ENDPOINTS = {
  employer: "https://employer.tangerino.com.br/",
  api: "https://apis.tangerino.com.br/",
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
