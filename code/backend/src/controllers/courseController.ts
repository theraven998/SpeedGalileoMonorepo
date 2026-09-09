import type { Request, Response } from "express";
import { CourseModel } from "@/models/Course.js";

export async function listCourses(_req: Request, res: Response): Promise<void> {
  const courses = await CourseModel.find().sort({ name: 1 });
  res.json(courses);
}
