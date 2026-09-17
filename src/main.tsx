// Ponto de entrada da aplicação: monta o componente <App /> (todo o app
// mora dentro dele, ver src/app/App.tsx) na div#root do index.html, e
// importa os estilos globais (Tailwind + tema + fontes, ver src/styles/).
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);
