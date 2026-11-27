import { defineConfig } from "vitest/config";
import path from "node:path";

// Lets tests import app files that use the "@/..." path alias.
export default defineConfig({ resolve: { alias: { "@": path.resolve(__dirname, "src") } } });
