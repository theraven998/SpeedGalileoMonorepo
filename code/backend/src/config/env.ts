import "dotenv/config";

// "HH:mm" -> minutos desde medianoche. Falla al arrancar si el formato es inválido.
function parseHm(name: string, fallback: string): number {
  const raw = process.env[name] ?? fallback;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw);
  if (!m) throw new Error(`${name} inválido: "${raw}" (formato HH:mm)`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/speedgalileo",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-cambiar-en-produccion",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  // Ventana de portería. Apagada por defecto: se escanea a cualquier hora.
  scanWindow: {
    enforced: process.env.SCAN_WINDOW_ENFORCED === "true",
    startMin: parseHm("SCAN_WINDOW_START", "06:00"),
    endMin: parseHm("SCAN_WINDOW_END", "08:30"),
  },
};
