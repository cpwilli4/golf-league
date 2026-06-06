import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes the build work at any URL path,
// including https://USERNAME.github.io/REPO-NAME/
export default defineConfig({
  plugins: [react()],
  base: './',
});
