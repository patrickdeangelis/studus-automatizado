import { Elysia, t } from 'elysia';
import { db } from '../db';
import { disciplines, students, grades, lessons, attendances } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';

export const disciplineRoutes = new Elysia({ prefix: '/disciplines' })
  .use(authMiddleware)
  .get('/', async ({ userId }) => {
    // List user's disciplines only
    const all = await db.select().from(disciplines).where(eq(disciplines.userId, userId)).all();
    return { disciplines: all };
  })
  .get('/:id/grades', async ({ params: { id }, userId }) => {
    // Verify discipline belongs to user
    const discipline = await db.select().from(disciplines)
      .where(and(eq(disciplines.id, id), eq(disciplines.userId, userId)))
      .get();

    if (!discipline) {
      return { error: 'Discipline not found or access denied' };
    }

    const results = await db.select({
        studentName: students.name,
        studentId: students.id,
        n1: grades.n1,
        n2: grades.n2,
        n3: grades.n3,
        faults: grades.faults,
        average: grades.average,
        situation: grades.situation,
        updatedAt: grades.updatedAt
    })
    .from(grades)
    .leftJoin(students, eq(grades.studentId, students.id))
    .where(and(eq(grades.disciplineId, id), eq(grades.userId, userId)))
    .all();

    return {
        discipline,
        grades: results
    };
  })
  .get('/:id/lessons', async ({ params: { id }, userId }) => {
    // Verify discipline belongs to user
    const discipline = await db.select().from(disciplines)
      .where(and(eq(disciplines.id, id), eq(disciplines.userId, userId)))
      .get();

    if (!discipline) {
      return { error: 'Discipline not found or access denied' };
    }

    const disciplineLessons = await db.select().from(lessons)
      .where(and(eq(lessons.disciplineId, id), eq(lessons.userId, userId)))
      .all();

    // Enrich with attendance count (summary)
    const lessonsWithStats = await Promise.all(disciplineLessons.map(async (l) => {
        const attendanceList = await db.select({
            studentId: attendances.studentId,
            studentName: students.name,
            present: attendances.present
        })
        .from(attendances)
        .leftJoin(students, eq(attendances.studentId, students.id))
        .where(and(eq(attendances.lessonId, l.id), eq(attendances.userId, userId)))
        .all();

        return {
            ...l,
            totalStudents: attendanceList.length,
            presentCount: attendanceList.filter(a => a.present).length,
            attendances: attendanceList
        };
    }));

    return {
        discipline,
        lessons: lessonsWithStats
    };
  });