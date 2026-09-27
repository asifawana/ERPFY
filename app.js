import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

try {
  const { startProdServer } = await import("vinext/server/prod-server");
  console.log(`Starting ERPFY Production Server on ${host}:${port}...`);
  await startProdServer({
    port,
    host,
    outDir: path.resolve(__dirname, "dist")
  });
} catch (err) {
  console.error("Failed to start ERPFY server:", err);
  process.exit(1);
}
