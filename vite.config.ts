// Configuração do Vite (bundler/dev server do projeto).
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


// Plugin herdado do scaffold original (Figma Make): permite importar
// arquivos com o prefixo "figma:asset/..." resolvendo pra src/assets/.
// Não é usado por nenhum arquivo atual do projeto, mas mantido caso volte
// a ser necessário.
function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  // Necessário pro GitHub Pages: o site é publicado em
  // https://<usuario>.github.io/<repo>/ (uma subpasta, não a raiz do
  // domínio), então todo asset (JS, CSS, modelos de IA, fotos) precisa
  // desse prefixo pra não dar 404. Em código, use import.meta.env.BASE_URL
  // em vez de escrever esse caminho na mão (ver src/lib/faceRecognition.ts
  // e src/data/knownPeople.ts).
  base: '/RelogioDePonto/',
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
