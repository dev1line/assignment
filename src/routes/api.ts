import { Router } from "express";
import createTeacherController from "../controllers/teacherController";
import { validateRequest } from "../middlewares";
import TeacherService from "../services/teacherService";
import {
  commonStudentsValidator,
  registerValidator,
  retrieveForNotificationsValidator,
  suspendValidator,
} from "../validators/requestValidator";

export default function createApiRouter(
  teacherService: TeacherService,
): Router {
  const router = Router();
  const teacherController = createTeacherController(teacherService);

  router.post(
    "/register",
    registerValidator,
    validateRequest,
    teacherController.register,
  );
  router.get(
    "/commonstudents",
    commonStudentsValidator,
    validateRequest,
    teacherController.getCommonStudents,
  );
  router.post(
    "/suspend",
    suspendValidator,
    validateRequest,
    teacherController.suspend,
  );
  router.post(
    "/retrievefornotifications",
    retrieveForNotificationsValidator,
    validateRequest,
    teacherController.retrieveForNotifications,
  );

  return router;
}
