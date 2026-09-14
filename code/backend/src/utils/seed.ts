import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { connectDB } from "@/config/db.js";
import { CourseModel } from "@/models/Course.js";
import { UserModel } from "@/models/User.js";
import { AttendanceRecordModel } from "@/models/AttendanceRecord.js";
import type { CourseGroup } from "@/types/contracts.js";
import { computeAttendance } from "@/utils/attendanceRules.js";
import { toBogotaParts, addDays, bogotaDayRangeUtc } from "@/utils/time.js";
import { isLectivo } from "@/utils/holidays.js";

// TODO: matrícula real pendiente. Con enrollment 0 el curso no entra al ranking ni a las métricas.
const COURSES: Array<{ name: string; group: CourseGroup; enrollment: number }> = [
  { name: "Noveno", group: "intervencion", enrollment: 0 },
  { name: "Décimo", group: "intervencion", enrollment: 0 },
  { name: "Once", group: "intervencion", enrollment: 0 },
];

const DEFAULT_PASSWORD = "cambiar123";

function newQrToken(): string {
  return randomBytes(16).toString("base64url");
}

async function upsertCourses(): Promise<Array<{ _id: Types.ObjectId; name: string }>> {
  if (COURSES.length === 0) {
    console.warn("AVISO: COURSES vacío (TODO). No se crean cursos reales.");
    return [];
  }

  const courses = await Promise.all(
    COURSES.map(({ name, group, enrollment }) =>
      CourseModel.findOneAndUpdate(
        { name },
        { $set: { group, enrollment, active: true } },
        { upsert: true, returnDocument: "after" }
      )
    )
  );
  console.log(`Cursos listos: ${courses.map((c) => c!.name).join(", ")}`);
  return courses as Array<{ _id: Types.ObjectId; name: string }>;
}

async function ensureStaffUser(email: string, name: string, role: "coordinacion" | "profesor"): Promise<void> {
  const exists = await UserModel.findOne({ email });
  if (exists) return;

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await UserModel.create({
    name,
    email,
    passwordHash,
    role,
    mustChangePassword: false,
    active: true,
  });
  console.log(`Usuario ${role} creado: ${email} / ${DEFAULT_PASSWORD}`);
}

async function ensureExampleStudent(defaultCourseId: Types.ObjectId | null): Promise<void> {
  const email = "estudiante1@galileo.edu.co";
  const exists = await UserModel.findOne({ email });
  if (exists) return;

  if (!defaultCourseId) {
    console.log("Sin curso disponible: se omite estudiante ejemplo (crea COURSES o corre con --demo).");
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const qrToken = newQrToken();
  await UserModel.create({
    name: "Estudiante Ejemplo",
    email,
    passwordHash,
    role: "estudiante",
    course: defaultCourseId,
    qrToken,
    mustChangePassword: false,
    active: true,
  });
  console.log(`Estudiante ejemplo creado. qrToken: ${qrToken}`);
}

// ---------------------------------------------------------------- demo

interface DemoCourseSpec {
  name: string;
  group: CourseGroup;
  slug: "i1" | "i2" | "i3" | "c1" | "c2" | "c3";
}

const DEMO_COURSES: DemoCourseSpec[] = [
  { name: "Demo Intervención 1", group: "intervencion", slug: "i1" },
  { name: "Demo Intervención 2", group: "intervencion", slug: "i2" },
  { name: "Demo Intervención 3", group: "intervencion", slug: "i3" },
  { name: "Demo Control 1", group: "control", slug: "c1" },
  { name: "Demo Control 2", group: "control", slug: "c2" },
  { name: "Demo Control 3", group: "control", slug: "c3" },
];

const DEMO_ENROLLMENT = 10;

async function upsertDemoCourses(): Promise<Record<string, { _id: Types.ObjectId; name: string }>> {
  const byName: Record<string, { _id: Types.ObjectId; name: string }> = {};
  for (const spec of DEMO_COURSES) {
    const course = await CourseModel.findOneAndUpdate(
      { name: spec.name },
      { $set: { group: spec.group, enrollment: DEMO_ENROLLMENT, active: true } },
      { upsert: true, returnDocument: "after" }
    );
    byName[spec.slug] = { _id: course!._id, name: course!.name };
  }
  console.log(`Cursos demo listos: ${DEMO_COURSES.map((c) => c.name).join(", ")}`);
  return byName;
}

async function upsertDemoStudents(
  coursesBySlug: Record<string, { _id: Types.ObjectId; name: string }>
): Promise<Record<string, Array<{ _id: Types.ObjectId; email: string }>>> {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const bySlug: Record<string, Array<{ _id: Types.ObjectId; email: string }>> = {};

  for (const spec of DEMO_COURSES) {
    const course = coursesBySlug[spec.slug]!;
    const students: Array<{ _id: Types.ObjectId; email: string }> = [];
    for (let k = 1; k <= 10; k++) {
      const email = `demo-${spec.slug}-${k}@demo.local`;
      let user = await UserModel.findOne({ email });
      if (!user) {
        user = await UserModel.create({
          name: `Demo ${course.name} ${k}`,
          email,
          passwordHash,
          role: "estudiante",
          course: course._id,
          qrToken: newQrToken(),
          mustChangePassword: false,
          active: true,
        });
      }
      students.push({ _id: user._id, email: user.email });
    }
    bySlug[spec.slug] = students;
  }

  console.log(`Estudiantes demo listos: ${DEMO_COURSES.length * 10} en total`);
  return bySlug;
}

/** Los 5 días lectivos más recientes, estrictamente anteriores a hoy en Bogotá. */
function recentLectivoDays(count: number): string[] {
  const today = toBogotaParts(new Date()).day;
  const days: string[] = [];
  let cursor = today;
  while (days.length < count) {
    cursor = addDays(cursor, -1);
    if (isLectivo(cursor)) days.push(cursor);
  }
  return days.reverse();
}

interface DemoScanSpec {
  slug: string;
  studentIndexes: number[]; // 1-based, dentro del curso
  minutesFromMidnight: number; // hora Bogotá en minutos desde medianoche
}

const EARLY = 7 * 60 + 5; // 07:05
const A_TIEMPO_I2 = 7 * 60 + 25; // 07:25
const TARDE_I2 = 7 * 60 + 45; // 07:45
const TEMPRANO_I3 = 7 * 60 + 10; // 07:10
const LATE_JUSTIFIED = 8 * 60; // 08:00

async function buildDemoAttendanceDocs(
  coursesBySlug: Record<string, { _id: Types.ObjectId; name: string }>,
  studentsBySlug: Record<string, Array<{ _id: Types.ObjectId; email: string }>>,
  porteroId: Types.ObjectId,
  days: string[]
): Promise<Array<Record<string, unknown>>> {
  const docs: Array<Record<string, unknown>> = [];

  const scanFor = (
    day: string,
    isFirstDay: boolean
  ): DemoScanSpec[] => [
    { slug: "i1", studentIndexes: [1, 2, 3, 4], minutesFromMidnight: EARLY },
    { slug: "i2", studentIndexes: [1, 2, 3, 4, 5, 6], minutesFromMidnight: A_TIEMPO_I2 },
    { slug: "i2", studentIndexes: [7, 8, 9], minutesFromMidnight: TARDE_I2 },
    { slug: "i3", studentIndexes: [1, 2, 3, 4, 5, 6], minutesFromMidnight: TEMPRANO_I3 },
    { slug: "c1", studentIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9], minutesFromMidnight: EARLY },
    { slug: "c2", studentIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9], minutesFromMidnight: EARLY },
    { slug: "c3", studentIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 9], minutesFromMidnight: EARLY },
    // Control 1, primer día demo: estudiante 10 llega tarde y justificado.
    ...(isFirstDay
      ? [{ slug: "c1", studentIndexes: [10], minutesFromMidnight: LATE_JUSTIFIED }]
      : []),
  ];

  for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
    const day = days[dayIdx]!;
    const isFirstDay = dayIdx === 0;
    const dayStart = bogotaDayRangeUtc(day).start;

    for (const scan of scanFor(day, isFirstDay)) {
      const course = coursesBySlug[scan.slug]!;
      const students = studentsBySlug[scan.slug]!;
      const justified = isFirstDay && scan.slug === "c1" && scan.minutesFromMidnight === LATE_JUSTIFIED;

      for (const idx of scan.studentIndexes) {
        const student = students[idx - 1]!;
        const scannedAt = new Date(dayStart.getTime() + scan.minutesFromMidnight * 60_000);
        const { day: computedDay, status, points, minutesLate } = computeAttendance(scannedAt);

        docs.push({
          student: student._id,
          course: course._id,
          day: computedDay,
          scannedAt,
          status,
          points,
          minutesLate,
          source: "qr",
          scannedBy: porteroId,
          justified,
          ...(justified ? { justification: "Cita médica" } : {}),
        });
      }
    }
  }

  return docs;
}

async function insertDemoAttendance(docs: Array<Record<string, unknown>>): Promise<void> {
  if (docs.length === 0) return;

  // Garantiza que el índice único { student, day } exista antes de insertar: es el que hace idempotente la re-ejecución.
  await AttendanceRecordModel.init();

  try {
    await AttendanceRecordModel.collection.insertMany(docs, { ordered: false });
  } catch (err: unknown) {
    // bulk write error: puede traer varios errores individuales, algunos duplicados (11000)
    const bulkErr = err as { code?: number; writeErrors?: Array<{ code?: number }> };
    const allDuplicates =
      bulkErr.code === 11000 ||
      (Array.isArray(bulkErr.writeErrors) && bulkErr.writeErrors.every((e) => e.code === 11000));
    if (!allDuplicates) throw err;
  }
}

async function seedDemo(): Promise<Record<string, { _id: Types.ObjectId; name: string }>> {
  const porteria = await UserModel.findOne({ role: "profesor" }).sort({ createdAt: 1 });
  if (!porteria) {
    throw new Error("No hay usuario de portería (profesor). Corre el seed base primero.");
  }

  const coursesBySlug = await upsertDemoCourses();
  const studentsBySlug = await upsertDemoStudents(coursesBySlug);

  const days = recentLectivoDays(5);
  console.log(`Días demo: ${days[0]} .. ${days[days.length - 1]!}`);

  const docs = await buildDemoAttendanceDocs(coursesBySlug, studentsBySlug, porteria._id, days);
  await insertDemoAttendance(docs);

  console.log(
    `Demo listo: ${DEMO_COURSES.length} cursos, ${DEMO_COURSES.length * 10} estudiantes, ${docs.length} registros de asistencia intentados.`
  );

  return coursesBySlug;
}

async function seed(): Promise<void> {
  await connectDB();

  const isDemo = process.argv.includes("--demo");

  const courses = await upsertCourses();

  await ensureStaffUser("coordinacion@galileo.edu.co", "Coordinación", "coordinacion");
  await ensureStaffUser("porteria@galileo.edu.co", "Profesor Portería", "profesor");

  const demoCoursesBySlug = isDemo ? await seedDemo() : null;

  // Prioridad: primer curso real; si no hay, primer curso demo (solo con --demo).
  const defaultCourseId = courses[0]?._id ?? demoCoursesBySlug?.["i1"]?._id ?? null;
  await ensureExampleStudent(defaultCourseId);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
