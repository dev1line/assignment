import { ModelStatic, Op, Transaction } from "sequelize";
import {
  NotificationRecipientProjection,
  TeacherRepositoryContract,
  TeacherStudentsProjection,
} from "../interfaces/types";
import Student from "../models/Student";
import Teacher from "../models/Teacher";
import BaseRepository from "./BaseRepository";

export default class TeacherRepository
  extends BaseRepository<Teacher>
  implements TeacherRepositoryContract
{
  private studentModel: ModelStatic<Student>;

  constructor(
    teacherModel: ModelStatic<Teacher>,
    studentModel: ModelStatic<Student>,
  ) {
    super(teacherModel);
    this.studentModel = studentModel;
  }

  async findOrCreateByEmail(
    email: string,
    transaction: Transaction,
  ): Promise<Teacher> {
    const [teacher] = await this.findOrCreate({
      where: { email },
      transaction,
    });
    return teacher;
  }

  async addStudents(
    teacher: Teacher,
    students: Student[],
    transaction: Transaction,
  ): Promise<void> {
    await teacher.addStudents(students, { transaction });
  }

  async findByEmailWithStudents(
    email: string,
  ): Promise<NotificationRecipientProjection[] | null> {
    const teacher = await this.findOne({
      where: { email },
      include: [
        {
          model: this.studentModel,
          attributes: ["email", "isSuspended"],
          through: { attributes: [] },
        },
      ],
    });

    if (!teacher) {
      return null;
    }

    return (teacher.Students || []).map((student) => ({
      email: student.email,
      isSuspended: student.isSuspended,
    }));
  }

  async findAllByEmailsWithStudents(
    emails: string[],
  ): Promise<TeacherStudentsProjection[]> {
    const teachers = await this.findAll({
      where: { email: { [Op.in]: emails } },
      include: [
        {
          model: this.studentModel,
          attributes: ["email"],
          through: { attributes: [] },
        },
      ],
    });

    return teachers.map((teacher) => ({
      email: teacher.email,
      students: (teacher.Students || []).map((student) => student.email),
    }));
  }
}
