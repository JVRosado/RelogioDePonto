export interface PunchRecord {
  id: string;
  personName: string;
  punchTypeLabel: string;
  moodLabel: string;
  date: string;
  time: string;
  timestamp: number;
}

const STORAGE_KEY = "moodpoint:records";

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

/** Busca registros cujo nome contém o texto informado (sem diferenciar maiúsculas/minúsculas), mais recentes primeiro. */
export function getRecordsByName(query: string): PunchRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getAllRecords();
  return readAll()
    .filter((r) => r.personName.toLowerCase().includes(normalized))
    .sort((a, b) => b.timestamp - a.timestamp);
}
