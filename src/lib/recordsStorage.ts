// ============================================================================
// recordsStorage.ts — Histórico de registros salvo no localStorage
// ----------------------------------------------------------------------------
// Guarda a lista de registros de ponto direto no navegador do usuário (API
// Web Storage), sem nenhum backend/banco de dados. Por isso:
//   - os dados ficam só naquele navegador/dispositivo específico (não
//     sincronizam entre pessoas nem entre aparelhos diferentes);
//   - persistem entre recarregamentos de página e reaberturas do navegador,
//     até o usuário limpar manualmente os dados do site;
//   - o localStorage é isolado por origem (domínio + porta), então o site
//     publicado (GitHub Pages) e o `npm run dev` local têm históricos
//     completamente separados.
// Usado por App.tsx: saveRecord() ao confirmar um registro, getAllRecords()/
// getRecordsByName() no modal "Ver Registros".
// ============================================================================

// Formato de cada registro salvo. Os rótulos (punchTypeLabel, moodLabel) já
// vêm prontos em texto (em vez de guardar só o "entrada"/"very_good" cru),
// pra não precisar importar os dicionários PUNCH_LABELS/MOOD_LABELS de
// App.tsx aqui.
export interface PunchRecord {
  id: string;
  personName: string;
  punchTypeLabel: string;
  moodLabel: string;
  date: string;
  time: string;
  timestamp: number; // Date.now() no momento do registro, usado só pra ordenar
}

// Chave única usada no localStorage. Guarda TODOS os registros juntos, como
// um array JSON serializado em texto (é a única forma que o localStorage
// aceita — ele só guarda strings).
const STORAGE_KEY = "moodpoint:records";

// Lê e decodifica todos os registros salvos. Protegido com try/catch porque
// localStorage pode falhar em alguns cenários (modo privado/anônimo em
// certos navegadores, armazenamento desabilitado, JSON corrompido etc.) —
// nesses casos, prefere devolver uma lista vazia a quebrar o app inteiro.
function readAll(): PunchRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PunchRecord[]) : [];
  } catch (err) {
    console.warn("Não foi possível ler os registros salvos localmente.", err);
    return [];
  }
}

/**
 * Salva um registro de ponto no localStorage do navegador. Os dados ficam
 * só naquele dispositivo/navegador (não há servidor/banco de dados) e
 * persistem entre recarregamentos até o usuário limpar os dados do site.
 */
export function saveRecord(record: Omit<PunchRecord, "id" | "timestamp">): void {
  try {
    const records = readAll();
    records.push({
      ...record,
      // id simples e único o suficiente pra este uso: timestamp + sufixo
      // aleatório (não precisa de um UUID de verdade aqui).
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn("Não foi possível salvar o registro localmente.", err);
  }
}

/** Todos os registros salvos, mais recentes primeiro. */
export function getAllRecords(): PunchRecord[] {
  return readAll().sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Busca registros cujo nome contém o texto informado (sem diferenciar
 * maiúsculas/minúsculas), mais recentes primeiro. Com o campo vazio, devolve
 * todos os registros (usado pelo modal de histórico pra já abrir mostrando
 * tudo, sem precisar digitar nada).
 */
export function getRecordsByName(query: string): PunchRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getAllRecords();
  return readAll()
    .filter((r) => r.personName.toLowerCase().includes(normalized))
    .sort((a, b) => b.timestamp - a.timestamp);
}
