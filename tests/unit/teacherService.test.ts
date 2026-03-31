import { NotFoundError } from "../../src/errors";
import {
  StudentRepositoryContract,
  TeacherRepositoryContract,
  TeacherServiceDeps,
} from "../../src/interfaces/types";
import TeacherService from "../../src/services/teacherService";
import { Sequelize, Transaction } from "sequelize";

describe("TeacherService.extractMentionedEmails", () => {
  it("should extract emails mentioned with @ in notification", () => {
    const notification =
      "Hello students! @studentagnes@gmail.com @studentmiche@gmail.com";
    const result = TeacherService.extractMentionedEmails(notification);
    expect(result).toEqual([
      "studentagnes@gmail.com",
      "studentmiche@gmail.com",
    ]);
  });
});

describe("TeacherService (with mocked repositories)", () => {
  let service: TeacherService;
  let mockTeacherRepo: jest.Mocked<TeacherRepositoryContract>;
  let mockStudentRepo: jest.Mocked<StudentRepositoryContract>;
  let mockSequelize: Pick<Sequelize, "transaction">;

  beforeEach(() => {
    mockTeacherRepo = {
      findOrCreateByEmail: jest.fn(),
      addStudents: jest.fn(),
      findByEmailWithStudents: jest.fn(),
      findAllByEmailsWithStudents: jest.fn(),
    };
    mockStudentRepo = {
      findOrCreateByEmail: jest.fn(),
      findByEmail: jest.fn(),
      findActiveByEmails: jest.fn(),
      suspend: jest.fn(),
    };
    mockSequelize = {
      transaction: jest.fn() as unknown as Sequelize["transaction"],
    };

    service = new TeacherService({
      teacherRepository: mockTeacherRepo,
      studentRepository: mockStudentRepo,
      sequelize: mockSequelize,
    } as TeacherServiceDeps);
  });

  it("should rollback transaction on error", async () => {
    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    } as unknown as Transaction;
    (mockSequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
    mockTeacherRepo.findOrCreateByEmail.mockRejectedValue(
      new Error("DB error"),
    );

    await expect(
      service.registerStudents("teacher@gmail.com", ["s1@gmail.com"]),
    ).rejects.toThrow("DB error");
    expect(mockTransaction.rollback).toHaveBeenCalled();
  });

  it("should throw NotFoundError when teacher not found", async () => {
    mockTeacherRepo.findAllByEmailsWithStudents.mockResolvedValue([]);
    await expect(
      service.getCommonStudents("missing@gmail.com"),
    ).rejects.toThrow(NotFoundError);
  });
});
