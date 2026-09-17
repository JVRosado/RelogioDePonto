import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import {
  CheckCircle,
  Clock,
  LogIn,
  Coffee,
  LogOut,
  Play,
  Fingerprint,
  Shield,
  AlertCircle,
  ChevronRight,
  Camera,
  ImageUp,
  Loader2,
} from "lucide-react";
import { loadFaceModels, initKnownFaces, recognizeFace, type KnownPerson } from "../lib/faceRecognition";
import { KNOWN_PEOPLE } from "../data/knownPeople";

type Step = "camera" | "recognizing" | "confirmed" | "punchType" | "mood" | "summary";

type PunchType = "entrada" | "inicio_intervalo" | "fim_intervalo" | "saida";

type MoodType = "very_good" | "good" | "neutral" | "bad" | "very_bad";

const PUNCH_OPTIONS: { id: PunchType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "entrada", label: "Entrada", icon: <LogIn size={28} />, color: "#0F4C5C" },
  { id: "inicio_intervalo", label: "Início do Intervalo", icon: <Coffee size={28} />, color: "#1a7a96" },
  { id: "fim_intervalo", label: "Fim do Intervalo", icon: <Play size={28} />, color: "#F47C20" },
  { id: "saida", label: "Saída", icon: <LogOut size={28} />, color: "#0a2b35" },
];

const MOOD_OPTIONS: { id: MoodType; emoji: string; label: string }[] = [
  { id: "very_good", emoji: "😄", label: "Muito bem" },
  { id: "good", emoji: "🙂", label: "Bem" },
  { id: "neutral", emoji: "😐", label: "Neutro" },
  { id: "bad", emoji: "🙁", label: "Mal" },
  { id: "very_bad", emoji: "😞", label: "Muito mal" },
];

const PUNCH_LABELS: Record<PunchType, string> = {
  entrada: "Entrada",
  inicio_intervalo: "Início do Intervalo",
  fim_intervalo: "Fim do Intervalo",
  saida: "Saída",
};

const MOOD_LABELS: Record<MoodType, string> = {
  very_good: "😄 Muito bem",
  good: "🙂 Bem",
  neutral: "😐 Neutro",
  bad: "🙁 Mal",
  very_bad: "😞 Muito mal",
};

const STEPS: Step[] = ["camera", "recognizing", "confirmed", "punchType", "mood", "summary"];
const STEP_LABELS = ["Câmera", "Reconhecimento", "Confirmado", "Tipo de Registro", "Humor", "Resumo"];

const formatDate = () => {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = () => {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

function ScanLine() {
  return (
    <motion.div
      className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent opacity-80"
      initial={{ top: "10%" }}
      animate={{ top: ["10%", "90%", "10%"] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function ScanOverlay({ scanning }: { scanning: boolean }) {
  return (
    <>
      <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-accent rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-accent rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-accent rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-accent rounded-br-lg" />
      {scanning && (
        <>
          <div className="absolute inset-6 rounded-full border-2 border-dashed border-white/60 overflow-hidden">
            <ScanLine />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent/60"
            animate={{ scale: [1, 1.15], opacity: [0.6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        </>
      )}
    </>
  );
}

function ProgressBar({ step }: { step: Step }) {
  const stepIndex = STEPS.indexOf(step);
  const visibleSteps = STEPS.filter(s => !["recognizing"].includes(s));
  const labelIndex = visibleSteps.indexOf(step);
  const totalVisible = visibleSteps.length;
  const progress = stepIndex === 1 ? (1 / (STEPS.length - 1)) * 100 : (labelIndex / (totalVisible - 1)) * 100;

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <div className="flex justify-between mb-2">
        {visibleSteps.map((s, i) => {
          const sIdx = STEPS.indexOf(s);
          const isActive = sIdx <= stepIndex;
          const label = STEP_LABELS[STEPS.indexOf(s)];
          return (
            <div key={s} className="flex flex-col items-center gap-1" style={{ width: `${100 / totalVisible}%` }}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isActive ? "bg-accent text-white shadow-sm" : "bg-secondary text-muted-foreground"
                }`}
              >
                {isActive && sIdx < stepIndex ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
        <motion.div
          className="h-full bg-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

type ScanMode = "camera" | "upload";

export default function App() {
  const [step, setStep] = useState<Step>("camera");
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedPunch, setSelectedPunch] = useState<PunchType | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [currentTime, setCurrentTime] = useState(formatTime());
  const [registrationTime, setRegistrationTime] = useState("");
  const [done, setDone] = useState(false);

  const [mode, setMode] = useState<ScanMode>("camera");
  const [modelsReady, setModelsReady] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedPerson, setRecognizedPerson] = useState<KnownPerson | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadedImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(formatTime()), 1000);
    return () => clearInterval(t);
  }, []);

  // Carrega os modelos de reconhecimento facial e as fotos pré-cadastradas uma única vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadFaceModels();
        await initKnownFaces(KNOWN_PEOPLE);
        if (!cancelled) setModelsReady(true);
      } catch (err) {
        console.error(err);
        if (!cancelled) setModelsError("Não foi possível carregar o reconhecimento facial.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  // Liga/desliga a webcam conforme o modo escolhido e a etapa atual
  useEffect(() => {
    let cancelled = false;

    if (mode !== "camera" || (step !== "camera" && step !== "recognizing")) {
      stopCamera();
      return;
    }

    if (!streamRef.current) {
      setCameraError(null);
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCameraReady(true);
        })
        .catch(() => {
          if (!cancelled) setCameraError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
        });
    }

    return () => {
      cancelled = true;
    };
  }, [mode, step, stopCamera]);

  // Garante que a câmera é desligada ao desmontar o componente
  useEffect(() => stopCamera, [stopCamera]);

  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl);
    setUploadedImageUrl(URL.createObjectURL(file));
  };

  const startRecognition = async () => {
    if (isRecognizing || !modelsReady) return;

    if (mode === "camera" && !cameraReady) {
      toast.error("Câmera indisponível.");
      return;
    }

    const inputEl = mode === "camera" ? videoRef.current : uploadedImgRef.current;
    if (!inputEl) {
      toast.error(mode === "camera" ? "Câmera indisponível." : "Selecione uma imagem de teste primeiro.");
      return;
    }

    setIsRecognizing(true);
    setStep("recognizing");
    setScanProgress(0);

    progressInterval.current = setInterval(() => {
      setScanProgress((p) => Math.min(p + 2, 90));
    }, 40);

    try {
      const result = await recognizeFace(inputEl);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      setScanProgress(100);

      if (result.person) {
        setRecognizedPerson(result.person);
        setTimeout(() => setStep("confirmed"), 300);
      } else {
        toast.error("Rosto não reconhecido. Tente novamente.");
        setStep("camera");
      }
    } catch (err) {
      console.error(err);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }
      toast.error("Erro ao processar o reconhecimento facial.");
      setStep("camera");
    } finally {
      setIsRecognizing(false);
    }
  };

  const handlePunchSelect = (punch: PunchType) => {
    setSelectedPunch(punch);
    setStep("mood");
  };

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood(mood);
    setRegistrationTime(formatTime());
    setStep("summary");
  };

  const handleConfirm = () => {
    setDone(true);
  };

  const handleReset = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (uploadedImageUrl) URL.revokeObjectURL(uploadedImageUrl);
    setUploadedImageUrl(null);
    setRecognizedPerson(null);
    setStep("camera");
    setSelectedPunch(null);
    setSelectedMood(null);
    setScanProgress(0);
    setDone(false);
  };

  const slideVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  const renderScanArea = (scanning: boolean) => (
    <div className="relative w-72 h-72 bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl overflow-hidden flex items-center justify-center border-2 border-dashed border-primary/20">
      {mode === "camera" ? (
        <>
          <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover" />
          {!cameraReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
              <Loader2 size={28} className="animate-spin text-primary/50" />
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/95 text-center px-6">
              <p className="text-sm text-destructive font-medium">{cameraError}</p>
            </div>
          )}
        </>
      ) : uploadedImageUrl ? (
        <img
          ref={uploadedImgRef}
          src={uploadedImageUrl}
          alt="Imagem de teste selecionada"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <label className="flex flex-col items-center gap-3 text-muted-foreground cursor-pointer px-6 text-center">
          <ImageUp size={36} />
          <span className="text-sm font-medium">Toque para selecionar uma imagem de teste</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      )}
      <ScanOverlay scanning={scanning} />
      <div className="absolute top-3 right-3 w-7 h-7 bg-accent rounded-full flex items-center justify-center">
        <div className="w-2.5 h-2.5 bg-white rounded-full" />
      </div>
    </div>
  );

  const canStartRecognition =
    modelsReady && !isRecognizing && (mode === "camera" ? cameraReady : Boolean(uploadedImageUrl));

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "'Inter', 'Poppins', sans-serif", background: "#f0f4f6" }}
    >
      {/* Header */}
      <header className="bg-primary shadow-md">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-sm">
              <Fingerprint size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
                MoodPoint
              </h1>
              <p className="text-primary-foreground/60 text-xs">Controle de Ponto Inteligente</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-xl">
            <Clock size={16} className="text-accent" />
            <span className="text-white font-mono font-semibold text-base tabular-nums">{currentTime}</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Progress indicator */}
        {!done && (
          <div className="w-full max-w-lg mb-8">
            <ProgressBar step={step} />
          </div>
        )}

        {/* Card */}
        <motion.div
          layout
          transition={{ layout: { duration: 0.3, ease: "easeInOut" } }}
          className="w-full max-w-lg bg-card rounded-3xl shadow-xl overflow-hidden"
          style={{ boxShadow: "0 8px 40px rgba(15,76,92,0.13)" }}
        >
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="p-10 flex flex-col items-center text-center gap-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
                >
                  <CheckCircle size={44} className="text-white" />
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-primary mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Registro Realizado!
                  </h2>
                  <p className="text-muted-foreground">Seu ponto foi registrado com sucesso.</p>
                </div>
                <div className="bg-secondary rounded-2xl px-8 py-4 w-full text-sm text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Colaborador</span>
                    <span className="font-semibold text-foreground">{recognizedPerson?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-semibold text-foreground">{selectedPunch ? PUNCH_LABELS[selectedPunch] : ""}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Humor</span>
                    <span className="font-semibold text-foreground">{selectedMood ? MOOD_LABELS[selectedMood] : ""}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horário</span>
                    <span className="font-semibold font-mono text-foreground">{registrationTime}</span>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="mt-2 w-full py-4 bg-primary text-white font-semibold rounded-2xl text-base hover:bg-primary/90 active:scale-95 transition-all duration-150"
                >
                  Novo Registro
                </button>
              </motion.div>
            ) : step === "camera" ? (
              <motion.div
                key="camera"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="p-8 flex flex-col items-center gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-primary mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Reconhecimento Facial
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                    {mode === "camera"
                      ? "Posicione seu rosto dentro da área indicada para realizar o reconhecimento facial."
                      : "Selecione uma foto de teste para simular o reconhecimento facial."}
                  </p>
                </div>

                {/* Alternância entre câmera real e imagem de teste */}
                <div className="flex bg-secondary rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setMode("camera")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      mode === "camera" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Camera size={16} />
                    Câmera
                  </button>
                  <button
                    onClick={() => setMode("upload")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                      mode === "upload" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <ImageUp size={16} />
                    Imagem de teste
                  </button>
                </div>

                {renderScanArea(false)}

                {modelsError ? (
                  <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 px-4 py-2 rounded-xl">
                    <AlertCircle size={14} />
                    <span>{modelsError}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs bg-secondary px-4 py-2 rounded-xl">
                    <Shield size={14} className="text-primary" />
                    <span>Dados protegidos por criptografia</span>
                  </div>
                )}

                <button
                  onClick={startRecognition}
                  disabled={!canStartRecognition}
                  className="w-full py-5 bg-accent text-white font-bold rounded-2xl text-lg flex items-center justify-center gap-3 hover:bg-accent/90 active:scale-95 transition-all duration-150 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {!modelsReady ? (
                    <>
                      <Loader2 size={24} className="animate-spin" />
                      Carregando reconhecimento...
                    </>
                  ) : (
                    <>
                      <Fingerprint size={24} />
                      Iniciar Reconhecimento
                    </>
                  )}
                </button>
              </motion.div>
            ) : step === "recognizing" ? (
              <motion.div
                key="recognizing"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="p-8 flex flex-col items-center gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-primary mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Analisando...
                  </h2>
                  <p className="text-muted-foreground text-sm">Mantenha o rosto na posição indicada</p>
                </div>

                {renderScanArea(true)}

                {/* Progress bar */}
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Processando biometria</span>
                    <span className="font-semibold text-primary">{scanProgress}%</span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent rounded-full"
                      animate={{ width: `${scanProgress}%` }}
                      transition={{ duration: 0.05 }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 w-full text-xs text-center">
                  {["Detecção facial", "Mapeamento", "Validação"].map((label, i) => (
                    <div key={label} className={`py-2 px-1 rounded-xl transition-all duration-300 ${scanProgress > i * 33 ? "bg-primary/10 text-primary font-semibold" : "bg-secondary text-muted-foreground"}`}>
                      {scanProgress > i * 33 && <CheckCircle size={12} className="mx-auto mb-1 text-accent" />}
                      {label}
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : step === "confirmed" ? (
              <motion.div
                key="confirmed"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="p-8 flex flex-col items-center gap-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg"
                >
                  <CheckCircle size={48} className="text-white" />
                </motion.div>

                <div className="text-center">
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-primary mb-1"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    Identidade Confirmada!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground text-sm"
                  >
                    Reconhecimento facial realizado com sucesso
                  </motion.p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-secondary rounded-2xl px-6 py-4 w-full flex items-center gap-4"
                >
                  <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                    👤
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-lg leading-tight">{recognizedPerson?.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {recognizedPerson?.role} • Matrícula {recognizedPerson?.matricula}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-xs text-green-600 font-medium">Ativo</span>
                    </div>
                  </div>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  onClick={() => setStep("punchType")}
                  className="w-full py-5 bg-accent text-white font-bold rounded-2xl text-lg flex items-center justify-center gap-3 hover:bg-accent/90 active:scale-95 transition-all duration-150 shadow-md"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  Continuar
                  <ChevronRight size={22} />
                </motion.button>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={handleReset}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-150"
                >
                  Não é você? Escanear novamente
                </motion.button>
              </motion.div>
            ) : step === "punchType" ? (
              <motion.div
                key="punchType"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="p-8 flex flex-col gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-primary mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Qual registro deseja realizar?
                  </h2>
                  <p className="text-muted-foreground text-sm">Selecione o tipo de ponto</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {PUNCH_OPTIONS.map((opt, i) => (
                    <motion.button
                      key={opt.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      onClick={() => handlePunchSelect(opt.id)}
                      className="flex flex-col items-center justify-center gap-3 py-7 px-4 rounded-2xl border-2 border-transparent hover:border-accent/40 active:scale-95 transition-all duration-150 shadow-sm"
                      style={{ background: `${opt.color}12` }}
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-sm"
                        style={{ background: opt.color }}
                      >
                        {opt.icon}
                      </div>
                      <span
                        className="font-semibold text-sm text-center leading-tight"
                        style={{ color: opt.color, fontFamily: "'Poppins', sans-serif" }}
                      >
                        {opt.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : step === "mood" ? (
              <motion.div
                key="mood"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="p-8 flex flex-col gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-primary mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Como está o seu humor neste momento?
                  </h2>
                  <p className="text-muted-foreground text-sm">Selecione como você está se sentindo</p>
                </div>

                <div className="flex justify-between gap-2">
                  {MOOD_OPTIONS.map((mood, i) => (
                    <motion.button
                      key={mood.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.07 }}
                      onClick={() => handleMoodSelect(mood.id)}
                      className={`flex flex-col items-center gap-2 py-4 flex-1 rounded-2xl border-2 transition-all duration-150 active:scale-90 ${
                        selectedMood === mood.id
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-transparent bg-secondary hover:border-primary/20"
                      }`}
                    >
                      <span className="text-3xl leading-none">{mood.emoji}</span>
                      <span className="text-[10px] font-medium text-muted-foreground leading-tight text-center">
                        {mood.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <AlertCircle size={12} />
                  Informação confidencial, usada apenas para bem-estar corporativo
                </p>
              </motion.div>
            ) : step === "summary" ? (
              <motion.div
                key="summary"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35 }}
                className="p-8 flex flex-col gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-primary mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    Confirmar Registro
                  </h2>
                  <p className="text-muted-foreground text-sm">Verifique os dados antes de confirmar</p>
                </div>

                <div className="bg-secondary rounded-2xl overflow-hidden divide-y divide-border">
                  {[
                    { label: "Colaborador", value: recognizedPerson?.name ?? "" },
                    { label: "Data", value: formatDate() },
                    { label: "Horário", value: registrationTime, mono: true },
                    { label: "Tipo de Registro", value: selectedPunch ? PUNCH_LABELS[selectedPunch] : "" },
                    { label: "Humor", value: selectedMood ? MOOD_LABELS[selectedMood] : "" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center px-5 py-3.5">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className={`text-sm font-semibold text-foreground text-right max-w-[55%] ${row.mono ? "font-mono" : ""}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep("punchType")}
                    className="flex-1 py-4 bg-secondary text-primary font-semibold rounded-2xl text-base hover:bg-secondary/80 active:scale-95 transition-all duration-150"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl text-base flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-md"
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    <CheckCircle size={20} />
                    Confirmar Registro
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-muted-foreground">
          MoodPoint v2.1.0 &nbsp;·&nbsp; © 2026 Todos os direitos reservados &nbsp;·&nbsp;
          <span className="text-primary font-medium">Seguro & Certificado</span>
        </p>
      </footer>

      <Toaster position="top-center" richColors />
    </div>
  );
}
