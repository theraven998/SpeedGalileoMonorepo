import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/config/db.js";
import { CourseModel } from "@/models/Course.js";
import { UserModel } from "@/models/User.js";

async function seed(): Promise<void> {
  await connectDB();

  const courseNames = ["Noveno", "Décimo", "Once"];
  const courses = await Promise.all(
    courseNames.map((name) => CourseModel.findOneAndUpdate({ name }, { name }, { upsert: true, returnDocument: "after" }))
  );
  console.log(`Cursos listos: ${courses.map((c) => c.name).join(", ")}`);

  const coordEmail = "coordinacion@galileo.edu.co";
  const exists = await UserModel.findOne({ email: coordEmail });
  if (!exists) {
    const passwordHash = await bcrypt.hash("cambiar123", 10);
    await UserModel.create({
      name: "Coordinación",
      email: coordEmail,
      passwordHash,
      role: "coordinacion",
    });
    console.log(`Usuario coordinación creado: ${coordEmail} / cambiar123`);
  }

  const profEmail = "porteria@galileo.edu.co";
  const profExists = await UserModel.findOne({ email: profEmail });
  if (!profExists) {
    const passwordHash = await bcrypt.hash("cambiar123", 10);
    await UserModel.create({
      name: "Profesor Portería",
      email: profEmail,
      passwordHash,
      role: "profesor",
    });
    console.log(`Usuario profesor creado: ${profEmail} / cambiar123`);
  }

  const example = await UserModel.findOne({ email: "estudiante1@galileo.edu.co" });
  if (!example) {
    const passwordHash = await bcrypt.hash("cambiar123", 10);
    const student = await UserModel.create({
      name: "Estudiante Ejemplo",
      email: "estudiante1@galileo.edu.co",
      passwordHash,
      role: "estudiante",
      course: courses[0]!._id,
      qrToken: randomUUID(),
    });
    console.log(`Estudiante ejemplo creado. qrToken: ${student.qrToken}`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
