import { Schema, model, type InferSchemaType, Types } from "mongoose";
import { COURSE_GROUP } from "@/types/contracts.js";

const courseSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // ej: "Noveno A"
    group: { type: String, enum: COURSE_GROUP, required: true },
    enrollment: { type: Number, required: true, min: 0 }, // matrícula activa, denominador de métricas; no se deriva contando usuarios
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

export type Course = InferSchemaType<typeof courseSchema> & { _id: Types.ObjectId };
export const CourseModel = model("Course", courseSchema);
