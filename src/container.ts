import { sequelize, Student, Teacher } from "./models";
import { StudentRepository, TeacherRepository } from "./repositories";
import TeacherService from "./services/teacherService";

const teacherRepository = new TeacherRepository(Teacher, Student);
const studentRepository = new StudentRepository(Student);

const teacherService = new TeacherService({
  teacherRepository,
  studentRepository,
  sequelize,
});

export { sequelize, teacherRepository, studentRepository, teacherService };
