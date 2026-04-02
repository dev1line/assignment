import type { Request } from "express";
import type {
  FindOptions,
  FindOrCreateOptions,
  Model,
  ModelStatic,
  Sequelize,
  Transaction,
} from "sequelize";
import type Student from "../models/Student";
import type Teacher from "../models/Teacher";

export interface RegisterBody {
  teacher: string;
  students: string[];
}

export interface SuspendBody {
  student: string;
}

export interface RetrieveBody {
  teacher: string;
  notification: string;
}

export interface CommonStudentsQuery {
  teacher: string | string[];
}

export interface TeacherStudentsProjection {
  email: string;
  students: string[];
}

/** Student row (email + suspension) as loaded for a teacher; persistence shape, not the notification use case. */
export interface StudentMembershipProjection {
  email: string;
  isSuspended: boolean;
}

export interface BaseRepositoryContract<TModel extends Model> {
  findOne(options: FindOptions): Promise<TModel | null>;
  findAll(options: FindOptions): Promise<TModel[]>;
  findOrCreate(options: FindOrCreateOptions): Promise<[TModel, boolean]>;
}

export interface TeacherRepositoryContract {
  findOrCreateByEmail(
    email: string,
    transaction: Transaction,
  ): Promise<Teacher>;
  addStudents(
    teacher: Teacher,
    students: Student[],
    transaction: Transaction,
  ): Promise<void>;
  findByEmailWithStudents(
    email: string,
  ): Promise<StudentMembershipProjection[] | null>;
  findAllByEmailsWithStudents(
    emails: string[],
  ): Promise<TeacherStudentsProjection[]>;
}

export interface StudentRepositoryContract {
  findOrCreateByEmail(
    email: string,
    transaction: Transaction,
  ): Promise<Student>;
  findByEmail(email: string): Promise<Student | null>;
  findActiveByEmails(emails: string[]): Promise<Student[]>;
  suspend(student: Student): Promise<Student>;
}

export interface TeacherServiceDeps {
  teacherRepository: TeacherRepositoryContract;
  studentRepository: StudentRepositoryContract;
  sequelize: Pick<Sequelize, "transaction">;
}

export interface TeacherController {
  register: (
    req: Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => void;
  getCommonStudents: (
    req: Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => void;
  suspend: (
    req: Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => void;
  retrieveForNotifications: (
    req: Request,
    res: import("express").Response,
    next: import("express").NextFunction,
  ) => void;
}

export interface RepositoryModels {
  teacherModel: ModelStatic<Teacher>;
  studentModel: ModelStatic<Student>;
}
