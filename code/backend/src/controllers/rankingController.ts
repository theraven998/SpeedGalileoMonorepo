import type { Request, Response } from "express";
import { AttendanceRecordModel } from "@/models/AttendanceRecord.js";

// Tablero público: promedio de puntos por curso, sin nombres de estudiantes.
export async function getRanking(_req: Request, res: Response): Promise<void> {
  const result = await AttendanceRecordModel.aggregate([
    {
      $group: {
        _id: "$course",
        totalPoints: { $sum: "$points" },
        registros: { $sum: 1 },
        avgPoints: { $avg: "$points" },
      },
    },
    {
      $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "course" },
    },
    { $unwind: "$course" },
    {
      $project: {
        _id: 0,
        courseId: "$course._id",
        courseName: "$course.name",
        avgPoints: { $round: ["$avgPoints", 2] },
        registros: 1,
      },
    },
    { $sort: { avgPoints: -1 } },
  ]);

  res.json(result);
}
