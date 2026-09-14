import mongoose, { Types } from "mongoose";
import { connectDB } from "@/config/db.js";
import { CourseModel } from "@/models/Course.js";
import { UserModel } from "@/models/User.js";
import { AttendanceRecordModel } from "@/models/AttendanceRecord.js";
import { computeAttendance } from "@/utils/attendanceRules.js";

// Autoindex OFF antes de conectar: si Mongoose intentara construir el índice
// único { student, day } antes de deduplicar, la conexión fallaría por E11000.
mongoose.set("autoIndex", false);

const BATCH_SIZE = 500;

async function migrateCourses(): Promise<void> {
  const courseCol = CourseModel.collection;

  const activeRes = await courseCol.updateMany({ active: { $exists: false } }, { $set: { active: true } });

  const incomplete = await courseCol
    .find({ $or: [{ group: { $exists: false } }, { enrollment: { $exists: false } }] })
    .toArray();

  console.log(`[1/5] courses: active backfilled en ${activeRes.modifiedCount} documento(s)`);
  if (incomplete.length > 0) {
    console.warn(
      `[1/5] AVISO: Backfill manual requerido: ${incomplete.map((c) => c.name).join(", ")}`
    );
  }
}

async function migrateAttendanceFields(): Promise<void> {
  const attendanceCol = AttendanceRecordModel.collection;

  // Recalcular day/status/points/minutesLate SOLO para documentos sin `day`.
  // Se usa la colección nativa (no el modelo) para no chocar con la validación
  // del esquema mientras el documento todavía tiene campos requeridos ausentes.
  const cursor = attendanceCol.find<{ _id: Types.ObjectId; scannedAt: Date }>(
    { day: { $exists: false } },
    { projection: { _id: 1, scannedAt: 1 } }
  );

  let recalculated = 0;
  let batch: Array<{
    updateOne: { filter: { _id: Types.ObjectId }; update: { $set: Record<string, unknown> } };
  }> = [];

  for await (const doc of cursor) {
    const { day, status, points, minutesLate } = computeAttendance(doc.scannedAt);
    batch.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { day, status, points, minutesLate } },
      },
    });
    recalculated++;
    if (batch.length >= BATCH_SIZE) {
      await attendanceCol.bulkWrite(batch);
      batch = [];
    }
  }
  if (batch.length > 0) {
    await attendanceCol.bulkWrite(batch);
  }

  const sourceRes = await attendanceCol.updateMany({ source: { $exists: false } }, { $set: { source: "qr" } });
  const justifiedRes = await attendanceCol.updateMany({ justified: { $exists: false } }, { $set: { justified: false } });
  const minutesLateRes = await attendanceCol.updateMany(
    { minutesLate: { $exists: false } },
    { $set: { minutesLate: 0 } }
  );

  console.log(
    `[2/5] attendancerecords: ${recalculated} recalculado(s) (day/status/points/minutesLate); ` +
      `source +${sourceRes.modifiedCount}, justified +${justifiedRes.modifiedCount}, minutesLate +${minutesLateRes.modifiedCount}`
  );
}

async function dropOldIndex(): Promise<void> {
  const attendanceCol = AttendanceRecordModel.collection;
  const indexes = await attendanceCol.indexes();
  const oldIndexExists = indexes.some((idx) => idx.name === "student_1_scannedAt_1");

  if (oldIndexExists) {
    await attendanceCol.dropIndex("student_1_scannedAt_1");
    console.log("[3/5] Índice viejo student_1_scannedAt_1 eliminado");
  } else {
    console.log("[3/5] Índice viejo student_1_scannedAt_1 no existe, nada que hacer");
  }
}

interface DuplicateGroup {
  _id: { student: Types.ObjectId; day: string };
  count: number;
  docs: Array<{ _id: Types.ObjectId; scannedAt: Date }>;
}

async function dedupeAndCreateIndexes(): Promise<void> {
  const attendanceCol = AttendanceRecordModel.collection;

  const duplicateGroups = await attendanceCol
    .aggregate<DuplicateGroup>([
      { $match: { student: { $exists: true }, day: { $exists: true } } },
      {
        $group: {
          _id: { student: "$student", day: "$day" },
          count: { $sum: 1 },
          docs: { $push: { _id: "$_id", scannedAt: "$scannedAt" } },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  let deletedCount = 0;
  for (const group of duplicateGroups) {
    const sorted = [...group.docs].sort((a, b) => a.scannedAt.getTime() - b.scannedAt.getTime());
    const idsToDelete = sorted.slice(1).map((d) => d._id);
    if (idsToDelete.length > 0) {
      const res = await attendanceCol.deleteMany({ _id: { $in: idsToDelete } });
      deletedCount += res.deletedCount ?? 0;
    }
  }

  console.log(
    `[4/5] Duplicados: ${duplicateGroups.length} grupo(s) student+day repetido(s), ${deletedCount} registro(s) eliminado(s)`
  );

  // createIndexes (no syncIndexes): construye los índices declarados en el
  // esquema sin tocar índices ajenos que pudieran existir en la colección.
  await AttendanceRecordModel.createIndexes();
  await CourseModel.createIndexes();
  await UserModel.createIndexes();
  console.log("[4/5] Índices creados: attendancerecords{student,day} único, {course,day}, {day}; courses; users");
}

async function migrateUsers(): Promise<void> {
  const userCol = UserModel.collection;

  const mustChangeRes = await userCol.updateMany(
    { mustChangePassword: { $exists: false } },
    { $set: { mustChangePassword: false } }
  );
  const activeRes = await userCol.updateMany({ active: { $exists: false } }, { $set: { active: true } });

  console.log(
    `[5/5] users: mustChangePassword +${mustChangeRes.modifiedCount}, active +${activeRes.modifiedCount}`
  );
}

async function migrate(): Promise<void> {
  await connectDB();

  await migrateCourses();
  await migrateAttendanceFields();
  await dropOldIndex();
  await dedupeAndCreateIndexes();
  await migrateUsers();

  console.log("Migración completada");
}

migrate()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Error en migración:", err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
