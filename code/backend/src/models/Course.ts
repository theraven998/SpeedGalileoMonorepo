import { Schema, model, type InferSchemaType } from "mongoose";

const courseSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // ej: "Noveno", "Décimo", "Once"
  },
  { timestamps: true }
);

export type Course = InferSchemaType<typeof courseSchema>;
export const CourseModel = model("Course", courseSchema);
