import type { KnownPerson } from "../lib/faceRecognition";

/**
 * Pessoas "pré-cadastradas" no protótipo, direto no código (sem tela de
 * cadastro). Para adicionar alguém: coloque uma foto do rosto em
 * public/known-faces/ e acrescente uma entrada aqui apontando pra ela.
 *
 * As fotos em public/known-faces/ vão pro repositório e ficam públicas no
 * site publicado (decisão consciente para este protótipo).
 */
const KNOWN_FACES_URL = `${import.meta.env.BASE_URL}known-faces`;

export const KNOWN_PEOPLE: KnownPerson[] = [
  {
    id: "joao-vitor",
    name: "João Vitor",
    role: "Estagiário de TI",
    matricula: "#1043",
    image: `${KNOWN_FACES_URL}/joao-vitor.jpeg`,
  },
];
