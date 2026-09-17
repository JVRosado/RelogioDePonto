// ============================================================================
// faceRecognition.ts — Integração com a biblioteca @vladmandic/face-api
// ----------------------------------------------------------------------------
// Toda a lógica de "IA" do app mora aqui. Roda 100% no navegador (usa
// TensorFlow.js por baixo dos panos), sem nenhum servidor externo.
//
// Como funciona, em 3 passos:
//   1. loadFaceModels()  -> baixa os modelos de rede neural (public/models/)
//   2. initKnownFaces()  -> para cada pessoa cadastrada (src/data/knownPeople.ts),
//                           processa a foto de referência e guarda um
//                           "descritor" (vetor de 128 números que representa
//                           aquele rosto)
//   3. recognizeFace()   -> processa a imagem capturada (câmera ou upload) da
//                           mesma forma, e compara o descritor resultante com
//                           os descritores conhecidos
// ============================================================================

import * as faceapi from "@vladmandic/face-api";

// import.meta.env.BASE_URL é o "base" configurado no vite.config.ts (ex:
// "/RelogioDePonto/" quando publicado no GitHub Pages, ou "/" em
// desenvolvimento local). Sem isso, os arquivos dariam 404 quando o site
// está hospedado dentro de uma subpasta.
const MODEL_URL = `${import.meta.env.BASE_URL}models`;

// Distância máxima (0 a 1) para considerar duas faces como a mesma pessoa.
// Quanto menor, mais rigorosa a comparação (mais fácil dar "não reconhecido"
// por engano). Quanto maior, mais permissivo (mais fácil confundir pessoas
// parecidas). 0.5 é o valor recomendado pela própria biblioteca.
const MATCH_THRESHOLD = 0.5;

// Configuração do detector de rosto (TinyFaceDetector). `inputSize` é a
// resolução interna usada pra procurar rostos na imagem — não é uma relação
// "quanto maior, melhor": 416 foi escolhido porque em testes deu a
// pontuação de confiança mais alta e consistente para fotos de rosto de
// perto (tipo selfie). `scoreThreshold` é a confiança mínima (0 a 1) pra
// considerar que "achou um rosto" ali.
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.5,
});

// Formato de cada pessoa "cadastrada" no protótipo (ver src/data/knownPeople.ts).
export interface KnownPerson {
  id: string;
  name: string;
  role: string;
  matricula: string;
  /** Caminho da foto de referência, relativo à pasta public (ex: "/known-faces/ana.jpg") */
  image: string;
}

// Resultado de uma tentativa de reconhecimento: a pessoa encontrada (ou null
// se não reconheceu ninguém) e a distância calculada (quanto menor, mais
// parecido — útil pra depuração).
export interface RecognitionResult {
  person: KnownPerson | null;
  distance: number;
}

// Estado interno do módulo (fica em memória enquanto a aba estiver aberta).
let modelsLoaded = false;
let matcher: faceapi.FaceMatcher | null = null; // compara descritores contra as pessoas cadastradas
let knownPeople: KnownPerson[] = []; // guardado aqui pra recognizeFace() poder devolver o objeto completo

/** Baixa e inicializa os 3 modelos de rede neural usados pelo app. Só faz isso uma vez. */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL), // acha ONDE está o rosto na imagem
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL), // mapeia 68 pontos do rosto (olhos, nariz, boca...) pra alinhar
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL), // gera o descritor de 128 números a partir do rosto alinhado
  ]);
  modelsLoaded = true;
}

/**
 * Roda os 3 modelos em sequência sobre uma imagem/frame e devolve o
 * descritor facial (vetor de 128 números), ou null se nenhum rosto foi
 * detectado com confiança suficiente.
 */
async function describeInput(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
) {
  const detection = await faceapi
    .detectSingleFace(input, DETECTOR_OPTIONS) // 1. localiza o rosto
    .withFaceLandmarks() // 2. mapeia os pontos do rosto (necessário pro passo seguinte)
    .withFaceDescriptor(); // 3. gera o descritor de 128 números
  return detection?.descriptor ?? null;
}

/**
 * Carrega as fotos de referência das pessoas cadastradas no código e calcula
 * o descritor facial de cada uma, para permitir comparação posterior.
 * Pessoas cuja foto não tiver um rosto detectável são ignoradas (com aviso no console).
 * Chamada uma vez, quando o app abre (ver App.tsx).
 */
export async function initKnownFaces(people: KnownPerson[]): Promise<void> {
  await loadFaceModels();
  knownPeople = people;

  const labeled: faceapi.LabeledFaceDescriptors[] = [];
  for (const person of people) {
    try {
      const img = await faceapi.fetchImage(person.image); // baixa a foto de public/known-faces/
      const descriptor = await describeInput(img);
      if (descriptor) {
        // "LabeledFaceDescriptors" associa o descritor ao id da pessoa, pra
        // depois o FaceMatcher conseguir dizer QUEM foi reconhecido.
        labeled.push(new faceapi.LabeledFaceDescriptors(person.id, [descriptor]));
      } else {
        console.warn(`Nenhum rosto detectado na foto de referência de "${person.name}" (${person.image}).`);
      }
    } catch (err) {
      // Acontece, por exemplo, quando o arquivo não existe (404) ou o nome
      // do arquivo em knownPeople.ts não bate exatamente com o que está em
      // public/known-faces/ (maiúsculas/minúsculas e extensão importam).
      console.warn(`Não foi possível carregar a foto de referência de "${person.name}" (${person.image}).`, err);
    }
  }

  // Se ninguém tiver descritor válido, `matcher` fica null e recognizeFace()
  // sempre vai retornar "não reconhecido" (em vez de dar erro).
  matcher = labeled.length > 0 ? new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD) : null;
}

/**
 * Detecta o rosto na imagem/frame informado e retorna a pessoa cadastrada mais
 * parecida, caso a distância fique dentro do limiar aceito. Caso contrário,
 * ou caso nenhum rosto seja detectado, retorna person: null.
 */
export async function recognizeFace(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<RecognitionResult> {
  if (!matcher) {
    // Nenhuma pessoa cadastrada tem foto válida — não tem com quem comparar.
    return { person: null, distance: Infinity };
  }

  const descriptor = await describeInput(input);
  if (!descriptor) {
    // Não achou nenhum rosto na imagem capturada.
    return { person: null, distance: Infinity };
  }

  // findBestMatch compara o descritor contra todos os cadastrados e devolve
  // o mais próximo. Se a distância for maior que MATCH_THRESHOLD, a própria
  // biblioteca já devolve label "unknown" em vez de forçar uma combinação.
  const best = matcher.findBestMatch(descriptor);
  if (best.label === "unknown") {
    return { person: null, distance: best.distance };
  }

  const person = knownPeople.find((p) => p.id === best.label) ?? null;
  return { person, distance: best.distance };
}
