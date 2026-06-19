import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2500,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "react";
          }
          if (
            id.includes("node_modules/@privy-io") ||
            id.includes("node_modules/@usdctofiat/offramp") ||
            id.includes("node_modules/viem")
          ) {
            return "wallet";
          }
          return undefined;
        },
      },
    },
  },
});
