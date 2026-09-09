// Vacío por defecto = mismo origen (ver next.config.ts rewrites hacia el backend).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const ROLES = ["profesor", "coordinacion", "estudiante"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_HOME: Record<Role, string> = {
  profesor: "/porteria",
  coordinacion: "/coordinacion",
  estudiante: "/estudiante",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  course?: string;
  /** Solo presente si role === "estudiante": el código que lo identifica al escanear en portería. */
  qrToken?: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Error desconocido");
  }

  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  scanQr: (qrToken: string) =>
    request<{ student: { id: string; name: string }; status: string; points: number; scannedAt: string }>(
      "/api/attendance/scan",
      { method: "POST", body: JSON.stringify({ qrToken }) }
    ),

  myAttendance: () => request<AttendanceRecord[]>("/api/attendance/me"),

  allAttendance: (params?: { courseId?: string }) => {
    const qs = params?.courseId ? `?courseId=${params.courseId}` : "";
    return request<AttendanceRecord[]>(`/api/attendance${qs}`);
  },

  ranking: () => request<RankingEntry[]>("/api/ranking"),

  courses: () => request<Course[]>("/api/courses"),

  signupEstudiante: (data: { name: string; email: string; password: string; courseId: string; code: string }) =>
    request<{ token: string; user: AuthUser }>("/api/auth/signup-estudiante", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface Course {
  _id: string;
  name: string;
}

export interface AttendanceRecord {
  _id: string;
  student: { _id: string; name: string; email: string } | string;
  course: { _id: string; name: string };
  scannedAt: string;
  status: "temprano" | "a_tiempo" | "tarde";
  points: number;
}

export interface RankingEntry {
  courseId: string;
  courseName: string;
  avgPoints: number;
  registros: number;
}

export { ApiError };
