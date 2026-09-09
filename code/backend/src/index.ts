import { app } from "@/app.js";
import { connectDB } from "@/config/db.js";
import { env } from "@/config/env.js";

async function main(): Promise<void> {
  await connectDB();
  app.listen(env.port, () => console.log(`API en http://localhost:${env.port}`));
}

main().catch((err) => {
  console.error("Error al iniciar servidor:", err);
  process.exit(1);
});
