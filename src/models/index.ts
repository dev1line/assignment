import sequelize from "../config/database";
import Teacher from "./Teacher";
import Student from "./Student";

Teacher.belongsToMany(Student, {
  through: "teacher_students",
  foreignKey: "teacher_id",
  otherKey: "student_id",
  timestamps: false,
});

Student.belongsToMany(Teacher, {
  through: "teacher_students",
  foreignKey: "student_id",
  otherKey: "teacher_id",
  timestamps: false,
});

export { sequelize, Teacher, Student };
