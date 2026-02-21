import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] }), react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['e2e/**'],
  },
})
