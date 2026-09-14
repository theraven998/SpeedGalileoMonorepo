import { Schema, model, type InferSchemaType } from "mongoose";
import { ATTENDANCE_STATUS, ATTENDANCE_SOURCE } from "@/types/contracts.js";

export { ATTENDANCE_STATUS, ATTENDANCE_SOURCE, type AttendanceStatus, type AttendanceSource } from "@/types/contracts.js";

const attendanceRecordSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true }, // denormalizado al momento del registro
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // "YYYY-MM-DD" en Bogotá
    scannedAt: { type: Date, required: true }, // instante UTC real; lo fija el controlador
    status: { type: String, enum: ATTENDANCE_STATUS, required: true },
    points: { type: Number, required: true, min: 0, max: 3 },
    minutesLate: { type: Number, required: true, default: 0, min: 0 },
    source: { type: String, enum: ATTENDANCE_SOURCE, required: true },
    scannedBy: { type: Schema.Types.ObjectId, ref: "User" }, // profesor; nulo cuando source = "import"
    justified: { type: Boolean, required: true, default: false },
    justification: {
      type: String,
      trim: true,
      required: function (this: { justified: boolean }) {
        return this.justified === true;
      },
    },
    correctedBy: { type: Schema.Types.ObjectId, ref: "User" }, // coordinación que editó el registro
    correctedAt: { type: Date },
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ student: 1, day: 1 }, { unique: true }); // un registro por día; su E11000 hace idempotente el escaneo
attendanceRecordSchema.index({ course: 1, day: 1 });
attendanceRecordSchema.index({ day: 1 });

export type AttendanceRecord = InferSchemaType<typeof attendanceRecordSchema>;
export const AttendanceRecordModel = model("AttendanceRecord", attendanceRecordSchema);
