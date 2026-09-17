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
    role: "Analista de processos e dados",
    matricula: "#0001",
    image: `${KNOWN_FACES_URL}/joao-vitor.jpeg`,
  },
  {
    id: "joao-miguel",
    name: "João miguel",
    role: "Jovem Aprendzi",
    matricula: "#0002",
    image: `${KNOWN_FACES_URL}/joao-miguel.jpeg`,
  },
  {
    id: "Alvaro",
    name: "Alvaro Gabriel",
    role: "Jovem Aprendzi",
    matricula: "#0003",
    image: `${KNOWN_FACES_URL}/Alvaro.jpeg`,
  },
  {
    id: "Isabella",
    name: "Isabella",
    role: "Jovem Aprendzi",
    matricula: "#0004",
    image: `${KNOWN_FACES_URL}/Isabela.jpeg`,
  },
  {
    id: "Pamela",
    name: "Pamela",
    role: "Jovem Aprendzi",
    matricula: "#0005",
    image: `${KNOWN_FACES_URL}/Pamela.jpeg`,
  },
  {
    id: "Milena",
    name: "Milena Nunes",
    role: "Jovem Aprendzi",
    matricula: "#0006",
    image: `${KNOWN_FACES_URL}/Milena.jpeg`,
  },
];

