import { Schema, model, type InferSchemaType, Types } from "mongoose";

export const ROLES = ["profesor", "coordinacion", "estudiante"] as const;
export type Role = (typeof ROLES)[number];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    // solo aplica a role "estudiante"
    course: { type: Schema.Types.ObjectId, ref: "Course" },
    qrToken: { type: String, unique: true, sparse: true }, // identificador único escaneado en portería
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const UserModel = model("User", userSchema);
