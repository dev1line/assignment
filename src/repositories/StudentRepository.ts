import { ModelStatic, Op, Transaction } from "sequelize";
import { StudentRepositoryContract } from "../types/types";
import Student from "../models/Student";
import BaseRepository from "./BaseRepository";

export default class StudentRepository
  extends BaseRepository<Student>
  implements StudentRepositoryContract
{
  constructor(studentModel: ModelStatic<Student>) {
    super(studentModel);
  }

  async findOrCreateByEmail(
    email: string,
    transaction: Transaction,
  ): Promise<Student> {
    const [student] = await this.findOrCreate({
      where: { email },
      transaction,
    });
    return student;
  }

  async findByEmail(email: string): Promise<Student | null> {
    return this.findOne({ where: { email } });
  }

  async findActiveByEmails(emails: string[]): Promise<Student[]> {
    return this.findAll({
      where: {
        email: { [Op.in]: emails },
        isSuspended: false,
      },
      attributes: ["email"],
    });
  }

  async suspend(student: Student): Promise<Student> {
    student.isSuspended = true;
    return student.save();
  }
}
