import type { KnownPerson } from "../lib/faceRecognition";

/**
 * Pessoas "pré-cadastradas" no protótipo, direto no código (sem tela de
 * cadastro). Para adicionar alguém: coloque uma foto do rosto em
 * public/known-faces/ e acrescente uma entrada aqui apontando pra ela.
 *
 * As fotos em public/known-faces/ não vão pro repositório (.gitignore) por
 * serem dados pessoais — cada pessoa que clonar o projeto precisa colocar
 * suas próprias fotos de teste localmente.
 */
const KNOWN_FACES_URL = `${import.meta.env.BASE_URL}known-faces`;

export const KNOWN_PEOPLE: KnownPerson[] = [
  {
    id: "ana-beatriz-costa",
    name: "Ana Beatriz Costa",
    role: "Analista de RH",
    matricula: "#1042",
    image: `${KNOWN_FACES_URL}/ana-beatriz-costa.jpg`,
  },
  {
    id: "joao-vitor",
    name: "João Vitor",
    role: "Estagiário de TI",
    matricula: "#1043",
    image: `${KNOWN_FACES_URL}/joao-vitor.jpeg`,
  },
];
