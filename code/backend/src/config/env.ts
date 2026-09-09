import "dotenv/config";

// Formato: "Noveno:CODIGO1,Décimo:CODIGO2,Once:CODIGO3"
function parseSignupCodes(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const entries = raw.split(",").map((pair) => {
    const [course, code] = pair.split(":").map((s) => s.trim());
    return [course?.toLowerCase() ?? "", code ?? ""] as const;
  });
  return Object.fromEntries(entries.filter(([course, code]) => course && code));
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/speedgalileo",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-cambiar-en-produccion",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  // curso (minúsculas) -> código de invitación requerido para autorregistro de estudiantes
  studentSignupCodes: parseSignupCodes(process.env.STUDENT_SIGNUP_CODES),
};
