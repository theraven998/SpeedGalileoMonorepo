import { Schema, model, type InferSchemaType, Types } from "mongoose";
import { ROLES } from "@/types/contracts.js";

export { ROLES, type Role } from "@/types/contracts.js";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    // solo aplica a role "estudiante"
    course: { type: Schema.Types.ObjectId, ref: "Course" },
    document: { type: String, trim: true, unique: true, sparse: true }, // solo estudiante, normalizado, solo lo ve coordinación
    qrToken: { type: String, unique: true, sparse: true }, // identificador único escaneado en portería
    mustChangePassword: { type: Boolean, required: true, default: false }, // true para altas masivas
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

userSchema.index({ course: 1, role: 1 });

export type User = InferSchemaType<typeof userSchema> & { _id: Types.ObjectId };
export const UserModel = model("User", userSchema);
