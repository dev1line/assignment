import { NotFoundError } from "../errors";
import {
  StudentMembershipProjection,
  StudentRepositoryContract,
  TeacherRepositoryContract,
  TeacherServiceDeps,
  TeacherStudentsProjection,
} from "../types/types";
import { extractMentionedEmails } from "../utils/extractMentionedEmails";

export default class TeacherService {
  private teacherRepository: TeacherRepositoryContract;
  private studentRepository: StudentRepositoryContract;
  private sequelize: TeacherServiceDeps["sequelize"];

  constructor({
    teacherRepository,
    studentRepository,
    sequelize,
  }: TeacherServiceDeps) {
    this.teacherRepository = teacherRepository;
    this.studentRepository = studentRepository;
    this.sequelize = sequelize;
  }

  async registerStudents(
    teacherEmail: string,
    studentEmails: string[],
  ): Promise<void> {
    const transaction = await this.sequelize.transaction();
    try {
      const teacher = await this.teacherRepository.findOrCreateByEmail(
        teacherEmail,
        transaction,
      );
      const students = await Promise.all(
        studentEmails.map((email) =>
          this.studentRepository.findOrCreateByEmail(email, transaction),
        ),
      );
      await this.teacherRepository.addStudents(teacher, students, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getCommonStudents(teacherEmails: string[] | string): Promise<string[]> {
    const emails = Array.isArray(teacherEmails)
      ? teacherEmails
      : [teacherEmails];
    const teachers: TeacherStudentsProjection[] =
      await this.teacherRepository.findAllByEmailsWithStudents(emails);

    if (teachers.length !== emails.length) {
      const foundEmails = teachers.map((t) => t.email);
      const missing = emails.filter((e) => !foundEmails.includes(e));
      throw new NotFoundError("Teacher(s)", missing.join(", "));
    }

    const studentSets = teachers.map((teacher) => new Set(teacher.students));
    const [firstSet] = studentSets;
    if (!firstSet) {
      return [];
    }
    return [...firstSet].filter((email) =>
      studentSets.every((set) => set.has(email)),
    );
  }

  async suspendStudent(studentEmail: string): Promise<void> {
    const student = await this.studentRepository.findByEmail(studentEmail);
    if (!student) {
      throw new NotFoundError("Student", studentEmail);
    }
    await this.studentRepository.suspend(student);
  }

  async retrieveForNotifications(
    teacherEmail: string,
    notification: string,
  ): Promise<string[]> {
    const teacherStudents: StudentMembershipProjection[] | null =
      await this.teacherRepository.findByEmailWithStudents(teacherEmail);
    if (!teacherStudents) {
      throw new NotFoundError("Teacher", teacherEmail);
    }

    const mentionedEmails = extractMentionedEmails(notification);
    const registeredEmails = teacherStudents
      .filter((student) => !student.isSuspended)
      .map((student) => student.email);

    let mentionedStudentEmails: string[] = [];
    if (mentionedEmails.length > 0) {
      const activeStudents =
        await this.studentRepository.findActiveByEmails(mentionedEmails);
      mentionedStudentEmails = activeStudents.map((student) => student.email);
    }

    return [...new Set([...registeredEmails, ...mentionedStudentEmails])];
  }
}
