// Configuração do Vite (bundler/dev server do projeto).
import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Necessário pro GitHub Pages: o site é publicado em
  // https://<usuario>.github.io/<repo>/ (uma subpasta, não a raiz do
  // domínio), então todo asset (JS, CSS, modelos de IA, fotos) precisa
  // desse prefixo pra não dar 404. Em código, use import.meta.env.BASE_URL
  // em vez de escrever esse caminho na mão (ver src/lib/faceRecognition.ts
  // e src/data/knownPeople.ts).
  base: '/RelogioDePonto/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
