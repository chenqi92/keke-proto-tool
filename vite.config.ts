import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'

// Plugin to copy release-notes to dist
const copyReleaseNotesPlugin = () => {
  return {
    name: 'copy-release-notes',
    closeBundle() {
      const srcDir = path.resolve(__dirname, 'release-notes')
      const destDir = path.resolve(__dirname, 'dist/release-notes')

      try {
        // Create destination directory
        mkdirSync(destDir, { recursive: true })

        // Copy all files from release-notes to dist/release-notes
        const files = readdirSync(srcDir)
        files.forEach(file => {
          const srcFile = path.join(srcDir, file)
          const destFile = path.join(destDir, file)

          // Only copy files, not directories
          if (statSync(srcFile).isFile()) {
            copyFileSync(srcFile, destFile)
            console.log(`Copied ${file} to dist/release-notes`)
          }
        })
      } catch (error) {
        console.error('Error copying release notes:', error)
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyReleaseNotesPlugin()],
  
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  
  // 2. tauri expects a fixed port, but allow fallback to avoid conflicts
  server: {
    port: 3000,
    strictPort: false, // Allow fallback to other ports if 3000 is occupied
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  
  // 3. to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
  
  build: {
    // Tauri supports es2021
    target: process.env.TAURI_PLATFORM == "windows" ? "chrome105" : "safari13",
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/pages": path.resolve(__dirname, "./src/pages"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/stores": path.resolve(__dirname, "./src/stores"),
      "@/assets": path.resolve(__dirname, "./src/assets"),
      "@/styles": path.resolve(__dirname, "./src/styles"),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
})
