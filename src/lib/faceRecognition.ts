import * as faceapi from "@vladmandic/face-api";

const MODEL_URL = "/models";

// Distância máxima (0 a 1) para considerar duas faces como a mesma pessoa.
// Quanto menor, mais rigorosa a comparação.
const MATCH_THRESHOLD = 0.5;

const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.5,
});

export interface KnownPerson {
  id: string;
  name: string;
  role: string;
  matricula: string;
  /** Caminho da foto de referência, relativo à pasta public (ex: "/known-faces/ana.jpg") */
  image: string;
}

export interface RecognitionResult {
  person: KnownPerson | null;
  distance: number;
}

let modelsLoaded = false;
let matcher: faceapi.FaceMatcher | null = null;
let knownPeople: KnownPerson[] = [];

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

async function describeInput(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
) {
  const detection = await faceapi
    .detectSingleFace(input, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

/**
 * Carrega as fotos de referência das pessoas cadastradas no código e calcula
 * o descritor facial de cada uma, para permitir comparação posterior.
 * Pessoas cuja foto não tiver um rosto detectável são ignoradas (com aviso no console).
 */
export async function initKnownFaces(people: KnownPerson[]): Promise<void> {
  await loadFaceModels();
  knownPeople = people;

  const labeled: faceapi.LabeledFaceDescriptors[] = [];
  for (const person of people) {
    try {
      const img = await faceapi.fetchImage(person.image);
      const descriptor = await describeInput(img);
      if (descriptor) {
        labeled.push(new faceapi.LabeledFaceDescriptors(person.id, [descriptor]));
      } else {
        console.warn(`Nenhum rosto detectado na foto de referência de "${person.name}" (${person.image}).`);
      }
    } catch (err) {
      console.warn(`Não foi possível carregar a foto de referência de "${person.name}" (${person.image}).`, err);
    }
  }

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
    return { person: null, distance: Infinity };
  }

  const descriptor = await describeInput(input);
  if (!descriptor) {
    return { person: null, distance: Infinity };
  }

  const best = matcher.findBestMatch(descriptor);
  if (best.label === "unknown") {
    return { person: null, distance: best.distance };
  }

  const person = knownPeople.find((p) => p.id === best.label) ?? null;
  return { person, distance: best.distance };
}
