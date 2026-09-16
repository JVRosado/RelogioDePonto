import type { KnownPerson } from "../lib/faceRecognition";

/**
 * Pessoas "pré-cadastradas" no protótipo, direto no código (sem tela de
 * cadastro). Para adicionar alguém: coloque uma foto do rosto em
 * public/known-faces/ e acrescente uma entrada aqui apontando pra ela.
 */
export const KNOWN_PEOPLE: KnownPerson[] = [
  {
    id: "ana-beatriz-costa",
    name: "Ana Beatriz Costa",
    role: "Analista de RH",
    matricula: "#1042",
    image: "/known-faces/ana-beatriz-costa.jpg",
  },
  {
    id: "joao-vitor",
    name: "João Vitor",
    role: "Estagiário de TI",
    matricula: "#1043",
    image: "/known-faces/joao-vitor.jpeg",
  },
  
];
