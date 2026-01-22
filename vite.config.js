import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "https://github.com/dikshanttatrari/family-cloud",
  server: {
    // proxy: {
    //   "/api": {
    //     target: "http://localhost:5000", // Points to your Node.js Backend
    //     changeOrigin: true,
    //     secure: false,
    //   },
    // },
  },
});
