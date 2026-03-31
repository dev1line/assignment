import { Request, Response } from "express";
import {
  CommonStudentsQuery,
  RegisterBody,
  RetrieveBody,
  SuspendBody,
  TeacherController,
} from "../interfaces/types";
import { asyncHandler } from "../middlewares";
import TeacherService from "../services/teacherService";

export default function createTeacherController(
  teacherService: TeacherService,
): TeacherController {
  const register = asyncHandler(async (req: Request, res: Response) => {
    const { teacher, students } = req.body as RegisterBody;
    await teacherService.registerStudents(teacher, students);
    res.status(204).send();
  });

  const getCommonStudents = asyncHandler(
    async (req: Request, res: Response) => {
      const { teacher } = req.query as unknown as CommonStudentsQuery;
      const students = await teacherService.getCommonStudents(teacher);
      res.status(200).json({ students });
    },
  );

  const suspend = asyncHandler(async (req: Request, res: Response) => {
    const { student } = req.body as SuspendBody;
    await teacherService.suspendStudent(student);
    res.status(204).send();
  });

  const retrieveForNotifications = asyncHandler(
    async (req: Request, res: Response) => {
      const { teacher, notification } = req.body as RetrieveBody;
      const recipients = await teacherService.retrieveForNotifications(
        teacher,
        notification,
      );
      res.status(200).json({ recipients });
    },
  );

  return { register, getCommonStudents, suspend, retrieveForNotifications };
}
