"use strict";

const { studentFactory, teacherFactory } = require("../factories/userFactory.cjs");

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const teachers = [
      teacherFactory({ email: "teacherken@gmail.com" }),
      teacherFactory({ email: "teacherjoe@gmail.com" }),
    ];

    const students = [
      studentFactory({ email: "commonstudent1@gmail.com" }),
      studentFactory({ email: "commonstudent2@gmail.com" }),
      studentFactory({ email: "student_only_under_teacher_ken@gmail.com" }),
      studentFactory({ email: "studentmary@gmail.com" }),
      studentFactory({ email: "studentagnes@gmail.com" }),
      studentFactory({ email: "studentmiche@gmail.com" }),
      studentFactory({ email: "studentbob@gmail.com" }),
    ];

    await queryInterface.bulkInsert("teachers", teachers);
    await queryInterface.bulkInsert("students", students);

    const insertedTeachers = await queryInterface.sequelize.query(
      "SELECT id, email FROM teachers WHERE email IN (:emails)",
      {
        replacements: { emails: teachers.map((teacher) => teacher.email) },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    const insertedStudents = await queryInterface.sequelize.query(
      "SELECT id, email FROM students WHERE email IN (:emails)",
      {
        replacements: { emails: students.map((student) => student.email) },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    const teacherByEmail = new Map(insertedTeachers.map((row) => [row.email, row.id]));
    const studentByEmail = new Map(insertedStudents.map((row) => [row.email, row.id]));

    const relations = [
      ["teacherken@gmail.com", "commonstudent1@gmail.com"],
      ["teacherken@gmail.com", "commonstudent2@gmail.com"],
      ["teacherken@gmail.com", "student_only_under_teacher_ken@gmail.com"],
      ["teacherken@gmail.com", "studentagnes@gmail.com"],
      ["teacherken@gmail.com", "studentbob@gmail.com"],
      ["teacherjoe@gmail.com", "commonstudent1@gmail.com"],
      ["teacherjoe@gmail.com", "commonstudent2@gmail.com"],
      ["teacherjoe@gmail.com", "studentmiche@gmail.com"],
      ["teacherjoe@gmail.com", "studentmary@gmail.com"],
    ].map(([teacherEmail, studentEmail]) => ({
      teacher_id: teacherByEmail.get(teacherEmail),
      student_id: studentByEmail.get(studentEmail),
    }));

    await queryInterface.bulkInsert("teacher_students", relations);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("teacher_students", null, {});
    await queryInterface.bulkDelete("students", null, {});
    await queryInterface.bulkDelete("teachers", null, {});
  },
};
