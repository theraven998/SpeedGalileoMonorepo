import { Schema, model, type InferSchemaType } from "mongoose";

export const ATTENDANCE_STATUS = ["temprano", "a_tiempo", "tarde"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

const attendanceRecordSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    scannedAt: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ATTENDANCE_STATUS, required: true },
    points: { type: Number, required: true, min: 0, max: 3 },
    scannedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }, // profesor en portería
  },
  { timestamps: true }
);

// un estudiante solo puede tener un registro por día
attendanceRecordSchema.index(
  { student: 1, scannedAt: 1 },
  { unique: false }
);

export type AttendanceRecord = InferSchemaType<typeof attendanceRecordSchema>;
export const AttendanceRecordModel = model("AttendanceRecord", attendanceRecordSchema);
