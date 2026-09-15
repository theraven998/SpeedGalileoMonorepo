import type {
  AdminCourseDto,
  AdminStudentDto,
  ChangePasswordRequest,
  CreateStudentRequest,
  CreateStudentResponse,
} from "@/lib/contracts";

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
  /** true mientras el usuario no cambie la contraseña temporal asignada al crear la cuenta. */
  mustChangePassword: boolean;
}

export type AttendanceStatus = "temprano" | "a_tiempo" | "tarde";

class ApiError extends Error {
  /** Cuerpo de la respuesta ya parseado (p. ej. `existing` del 409 de /attendance/scan). */
  public body?: unknown;

  constructor(
    public status: number,
    message: string,
    body?: unknown
  ) {
    super(message);
    this.body = body;
  }
}

export function clearSession(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

/** true si el JWT no se puede leer o su `exp` ya pasó. */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
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
    // Token vencido/inválido fuera de /api/auth (ahí 401 = credenciales incorrectas): cerrar sesión.
    if (res.status === 401 && token && !path.startsWith("/api/auth/") && typeof window !== "undefined") {
      clearSession();
      window.location.replace("/login");
    }
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const message = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "Error desconocido";
    throw new ApiError(res.status, message, body);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  scanQr: (qrToken: string) =>
    request<ScanResponse>("/api/attendance/scan", { method: "POST", body: JSON.stringify({ qrToken }) }),

  myAttendance: () => request<AttendanceRecord[]>("/api/attendance/me"),

  allAttendance: (params?: { courseId?: string }) => {
    const qs = params?.courseId ? `?courseId=${params.courseId}` : "";
    return request<AttendanceRecord[]>(`/api/attendance${qs}`);
  },

  ranking: () => request<RankingEntry[]>("/api/ranking"),

  courses: () => request<Course[]>("/api/courses"),


  changeMyPassword: (body: ChangePasswordRequest) =>
    request<void>("/api/auth/me/password", { method: "PATCH", body: JSON.stringify(body) }),

  adminCourses: () => request<AdminCourseDto[]>("/api/courses/admin"),

  createStudent: (body: CreateStudentRequest) =>
    request<CreateStudentResponse>("/api/students", { method: "POST", body: JSON.stringify(body) }),

  listStudents: (courseId?: string) => {
    const qs = courseId ? `?courseId=${courseId}` : "";
    return request<AdminStudentDto[]>(`/api/students${qs}`);
  },
};

export interface Course {
  id: string;
  name: string;
}

/**
 * Documentos crudos de Mongo (con `_id`), tal como los devuelven
 * `GET /api/attendance/me` y `GET /api/attendance`.
 */
export interface AttendanceRecord {
  _id: string;
  student: { _id: string; name: string; email: string } | string;
  course: { _id: string; name: string };
  day: string;
  scannedAt: string;
  status: AttendanceStatus;
  points: number;
  minutesLate: number;
  source: "qr" | "manual" | "import";
  justified: boolean;
}

export interface RankingEntry {
  courseId: string;
  courseName: string;
  /** 0..1. */
  pctPuntual: number;
  diasEvaluados: number;
  posicion: number;
}

/** 201 de `POST /api/attendance/scan`. */
export interface ScanResponse {
  student: { id: string; name: string };
  course: { id: string; name: string };
  day: string;
  status: AttendanceStatus;
  points: number;
  minutesLate: number;
  scannedAt: string;
}

/** Cuerpo del 409 de `POST /api/attendance/scan` (disponible en `ApiError.body`). */
export interface ScanConflictBody {
  error: string;
  existing: {
    day: string;
    status: AttendanceStatus;
    points: number;
    scannedAt: string;
  };
}

export { ApiError };
