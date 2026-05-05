import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  server: {
    open: "/index.html"
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        create: fileURLToPath(new URL("./create.html", import.meta.url)),
        homePage: fileURLToPath(new URL("./homePage.html", import.meta.url))
      }
    }
  }
});