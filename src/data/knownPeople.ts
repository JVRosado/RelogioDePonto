// ============================================================================
// knownPeople.ts — Pessoas "pré-cadastradas" no protótipo
// ----------------------------------------------------------------------------
// Não existe tela de cadastro no app: quem vai ser reconhecido é definido
// aqui, direto no código. Para adicionar alguém:
//   1. Salve uma foto do rosto (de frente, bem iluminada) em
//      public/known-faces/nome-do-arquivo.jpg
//   2. Acrescente um novo objeto no array abaixo, com o campo `image`
//      apontando pro MESMO nome de arquivo (maiúsculas/minúsculas e a
//      extensão, tipo .jpg vs .jpeg, precisam bater exatamente — senão a
//      foto dá 404 e a pessoa nunca é reconhecida).
//   3. git add / commit / push — o GitHub Actions publica sozinho.
//
// As fotos em public/known-faces/ vão pro repositório e ficam públicas no
// site publicado (decisão consciente tomada para este protótipo).
//
// Quem realmente usa essa lista é src/lib/faceRecognition.ts (função
// initKnownFaces, chamada a partir de App.tsx).
// ============================================================================

import type { KnownPerson } from "../lib/faceRecognition";

// import.meta.env.BASE_URL é o "base" do Vite (ver vite.config.ts) — sem
// isso, os caminhos das fotos quebrariam quando o site está publicado numa
// subpasta (GitHub Pages).
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
    // ATENÇÃO: não existe public/known-faces/Milena.jpeg neste momento —
    // essa entrada vai gerar um aviso no console ("não foi possível
    // carregar a foto de referência") e a Milena nunca será reconhecida até
    // essa foto ser adicionada.
    id: "Milena",
    name: "Milena Nunes",
    role: "Jovem Aprendzi",
    matricula: "#0006",
    image: `${KNOWN_FACES_URL}/Milena.jpeg`,
  },
];
