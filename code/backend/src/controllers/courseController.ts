import type { Request, Response } from "express";
import { CourseModel } from "@/models/Course.js";
import { UserModel } from "@/models/User.js";
import type { AdminCourseDto, CourseGroup, PublicCourseDto } from "@/types/contracts.js";

/** Público: solo id y name. Nunca group/enrollment/active — publicar qué curso es control invalida el experimento. */
export async function listCourses(_req: Request, res: Response): Promise<void> {
  const courses = await CourseModel.find().select("name").sort({ name: 1 }).lean();
  const dto: PublicCourseDto[] = courses.map((course) => ({
    id: String(course._id),
    name: course.name,
  }));
  res.json(dto);
}

/** Coordinación: incluye matrícula, grupo y conteo de estudiantes activos registrados. */
export async function listAdminCourses(_req: Request, res: Response): Promise<void> {
  const [courses, counts] = await Promise.all([
    CourseModel.find().sort({ name: 1 }).lean(),
    UserModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { role: "estudiante", active: { $ne: false } } },
      { $group: { _id: "$course", count: { $sum: 1 } } },
    ]),
  ]);

  const registeredByCourse = new Map<string, number>(
    counts.map((entry) => [String(entry._id), entry.count])
  );

  const dto: AdminCourseDto[] = courses.map((course) => ({
    id: String(course._id),
    name: course.name,
    group: course.group as CourseGroup,
    enrollment: course.enrollment as number,
    active: course.active ?? true,
    registered: registeredByCourse.get(String(course._id)) ?? 0,
  }));
  res.json(dto);
}
