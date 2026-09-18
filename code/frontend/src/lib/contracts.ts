/**
 * Tipos canónicos del sistema SpeedGalileo.
 *
 * Fuente única de verdad. Replicar sin modificar en:
 *   - code/backend/src/types/contracts.ts
 *   - code/frontend/src/lib/contracts.ts
 *
 * Ver contracts/README.md antes de editar.
 */

// ---------------------------------------------------------------- enums

export const ROLES = ["profesor", "coordinacion", "estudiante"] as const;
export type Role = (typeof ROLES)[number];

/** Estados persistidos en la colección de registros. */
export const ATTENDANCE_STATUS = ["temprano", "a_tiempo", "tarde"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

/** Estados de lectura. `ausente` es derivado, nunca se almacena. */
export type DerivedAttendanceStatus = AttendanceStatus | "ausente";

export const ATTENDANCE_SOURCE = ["qr", "manual", "import", "documento"] as const;
export type AttendanceSource = (typeof ATTENDANCE_SOURCE)[number];

export const COURSE_GROUP = ["intervencion", "control"] as const;
export type CourseGroup = (typeof COURSE_GROUP)[number];

// ---------------------------------------------------------------- reglas

/** Minutos desde medianoche, hora de Bogotá. */
export const EARLY_CUTOFF_MIN = 7 * 60 + 20; // 07:20 -> 3 pts
export const LATE_CUTOFF_MIN = 7 * 60 + 30;  // 07:30 -> 2 pts

/** Hora oficial de inicio de clase. Base de los minutos perdidos. */
export const CLASS_START_MIN = 7 * 60 + 30;  // PENDIENTE DE CONFIRMAR

export const TZ = "America/Bogota";

/** Fecha lectiva en formato "YYYY-MM-DD", hora de Bogotá. */
export type DayString = string;

// ---------------------------------------------------------------- primitivas

export interface CourseRef {
  id: string;
  name: string;
}

export interface StudentRef {
  id: string;
  name: string;
}

// ---------------------------------------------------------------- auth

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  courseName?: string;
  mustChangePassword: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface MeResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  course: CourseRef | null;
  /** Solo presente para role "estudiante". Tratar como credencial. */
  qrToken: string | null;
  mustChangePassword: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface QrResponse {
  qrToken: string;
  /** PNG en base64, listo para <img src>. */
  dataUrl: string;
}

// ---------------------------------------------------------------- asistencia

export interface AttendanceRecordDto {
  id: string;
  student: StudentRef;
  course: CourseRef;
  day: DayString;
  scannedAt: string; // ISO 8601 UTC
  status: AttendanceStatus;
  points: number;
  minutesLate: number;
  source: AttendanceSource;
  justified: boolean;
  justification?: string;
}

/** Lo que ve el estudiante de sí mismo. Sin identidad redundante. */
export interface MyAttendanceDto {
  day: DayString;
  scannedAt: string;
  status: AttendanceStatus;
  points: number;
  minutesLate: number;
  justified: boolean;
}

export interface ScanRequest {
  qrToken: string;
}

export interface ScanDocumentRequest {
  document: string;
}

/** Respuesta de `GET /api/attendance/lookup-document`. Datos mínimos, no crea asistencia. */
export interface DocumentLookupResponse {
  student: StudentRef;
  course: CourseRef;
  alreadyToday: boolean;
}

export interface ScanResponse {
  student: StudentRef;
  course: CourseRef;
  day: DayString;
  status: AttendanceStatus;
  points: number;
  minutesLate: number;
  scannedAt: string;
}

/** Cuerpo del 409. El escaneo duplicado no es un fallo, es idempotencia. */
export interface ScanConflictResponse {
  error: string;
  existing: {
    day: DayString;
    status: AttendanceStatus;
    points: number;
    scannedAt: string;
  };
}

/** Respuesta de `POST /api/attendance/practice-scan`: misma forma que el escaneo real, pero NO se guarda. */
export interface PracticeScanResponse extends ScanResponse {
  practice: true;
}

/** Respuesta de `GET /api/attendance/scan-config`. Minutos desde medianoche, hora de Bogotá. */
export interface ScanConfigResponse {
  windowEnforced: boolean;
  windowStartMin: number;
  windowEndMin: number;
}

export interface ManualAttendanceRequest {
  studentId: string;
  day: DayString;
  /** "HH:mm" en hora de Bogotá. */
  time: string;
  note?: string;
}

export interface PatchAttendanceRequest {
  time?: string;
  justified?: boolean;
  justification?: string;
  note?: string;
}

// ---------------------------------------------------------------- cursos

/** Respuesta pública. Nunca expone group ni enrollment. */
export interface PublicCourseDto {
  id: string;
  name: string;
}

export interface AdminCourseDto {
  id: string;
  name: string;
  group: CourseGroup;
  enrollment: number;
  active: boolean;
  /** Usuarios estudiante activos ya dados de alta en ese curso. */
  registered: number;
}

export interface UpsertCourseRequest {
  name: string;
  group: CourseGroup;
  enrollment: number;
  active: boolean;
}

// ---------------------------------------------------------------- estudiantes

export interface CreateStudentRequest {
  name: string;
  email: string;
  /** Se normaliza en el servidor: sin espacios, puntos ni guiones, mayúsculas. */
  document: string;
  courseId: string;
}

/** Vista de coordinación. Nunca incluye qrToken ni passwordHash. */
export interface AdminStudentDto {
  id: string;
  name: string;
  email: string;
  document: string;
  course: CourseRef;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string; // ISO 8601 UTC
}

export interface CreateStudentResponse {
  student: AdminStudentDto;
  /** Se devuelve una sola vez. No se persiste en claro. */
  tempPassword: string;
  /** Credencial. Solo para imprimir el carnet. */
  qrToken: string;
}

/** Respuesta de `GET /api/students/qr-lookup`: solo el nombre, no crea asistencia ni expone más datos. */
export interface QrLookupResponse {
  name: string;
}

// ---------------------------------------------------------------- importación

export interface ImportError {
  row: number;
  reason: string;
}

export interface StudentImportResponse {
  created: number;
  skipped: number;
  /** Se devuelve una sola vez. No se persiste en claro. */
  credentials: Array<{ email: string; tempPassword: string }>;
  errors: ImportError[];
}

export interface AttendanceImportResponse {
  inserted: number;
  skipped: number;
  errors: ImportError[];
}

// ---------------------------------------------------------------- ranking

export interface RankingEntryDto {
  courseId: string;
  courseName: string;
  /** 0..1. Puntuales sobre matrícula, ponderado por día lectivo. */
  pctPuntual: number;
  diasEvaluados: number;
  /** Compartida en caso de empate. */
  posicion: number;
}

// ---------------------------------------------------------------- reportes

export interface CourseSummaryDto {
  courseId: string;
  courseName: string;
  group: CourseGroup;
  enrollment: number;
  diasLectivos: number;
  puntuales: number;
  tarde: number;
  ausentes: number;
  justificados: number;
  pctPuntual: number;
  minutosPerdidos: number;
  minutosPerdidosPorEstudiante: number;
}

// ---------------------------------------------------------------- errores

export interface ApiErrorBody {
  error: string;
}
