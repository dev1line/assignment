import swaggerJSDoc from "swagger-jsdoc";

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Teacher-Student API",
      version: "1.0.0",
      description:
        "REST API for registering students to teachers, querying common students, suspending students, and retrieving notification recipients.",
    },
    servers: [
      {
        url: "/",
        description: "Same origin (overridden per-request on /api-docs.json)",
      },
    ],
    tags: [
      {
        name: "Teacher Management",
        description: "Operations for teacher-student relationship management",
      },
    ],
    components: {
      schemas: {
        RegisterRequest: {
          type: "object",
          required: ["teacher", "students"],
          properties: {
            teacher: {
              type: "string",
              format: "email",
              example: "teacherken@gmail.com",
              description:
                "Teacher email address. This value is normalized before persistence.",
            },
            students: {
              type: "array",
              minItems: 1,
              items: {
                type: "string",
                format: "email",
              },
              example: [
                "studentjon@gmail.com",
                "studenthon@gmail.com",
                "commonstudent1@gmail.com",
                "commonstudent2@gmail.com",
              ],
              description:
                "List of student email addresses to register under this teacher.",
            },
          },
          example: {
            teacher: "teacherken@gmail.com",
            students: [
              "studentjon@gmail.com",
              "studenthon@gmail.com",
              "commonstudent1@gmail.com",
              "commonstudent2@gmail.com",
            ],
          },
        },
        CommonStudentsResponse: {
          type: "object",
          properties: {
            students: {
              type: "array",
              items: {
                type: "string",
                format: "email",
              },
              example: ["commonstudent1@gmail.com", "commonstudent2@gmail.com"],
              description:
                "Students who are registered to all requested teacher accounts.",
            },
          },
          required: ["students"],
        },
        SuspendRequest: {
          type: "object",
          required: ["student"],
          properties: {
            student: {
              type: "string",
              format: "email",
              example: "studentmary@gmail.com",
              description:
                "Student email address to suspend. Suspended students will not receive notifications.",
            },
          },
          example: {
            student: "studentmary@gmail.com",
          },
        },
        RetrieveForNotificationsRequest: {
          type: "object",
          required: ["teacher", "notification"],
          properties: {
            teacher: {
              type: "string",
              format: "email",
              example: "teacherken@gmail.com",
              description: "Teacher email address sending the notification.",
            },
            notification: {
              type: "string",
              example:
                "Hello students! @studentagnes@gmail.com @studentmiche@gmail.com",
              description:
                "Notification body text. Mentioned emails using @email syntax are also considered recipients if active.",
            },
          },
          example: {
            teacher: "teacherken@gmail.com",
            notification:
              "Hello students! @studentagnes@gmail.com @studentmiche@gmail.com",
          },
        },
        RetrieveForNotificationsResponse: {
          type: "object",
          required: ["recipients"],
          properties: {
            recipients: {
              type: "array",
              items: {
                type: "string",
                format: "email",
              },
              example: [
                "studentjon@gmail.com",
                "studenthon@gmail.com",
                "studentmiche@gmail.com",
              ],
              description:
                "Unique list of active recipients combining registered students and valid mentioned students.",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              example: "Teacher not found: teacherdoesnotexist@gmail.com",
              description: "Human-readable error message.",
            },
          },
        },
      },
    },
    paths: {
      "/api/register": {
        post: {
          tags: ["Teacher Management"],
          summary: "Register one teacher with one or more students",
          description:
            "Creates teacher/student records if they do not exist, then links all provided students to the teacher.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RegisterRequest",
                },
                examples: {
                  registerManyStudents: {
                    summary: "Register a teacher with multiple students",
                    value: {
                      teacher: "teacherken@gmail.com",
                      students: [
                        "studentjon@gmail.com",
                        "studenthon@gmail.com",
                        "commonstudent1@gmail.com",
                        "commonstudent2@gmail.com",
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "204": {
              description:
                "Registration succeeded. No response body is returned by design.",
            },
            "400": {
              description: "Validation error on input payload.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                  example: {
                    message: "Students must be a non-empty array",
                  },
                },
              },
            },
            "500": {
              description: "Unexpected server error.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/commonstudents": {
        get: {
          tags: ["Teacher Management"],
          summary: "Retrieve students common to all requested teachers",
          description:
            "Accepts one or multiple teacher query parameters and returns the intersection of registered students.",
          parameters: [
            {
              name: "teacher",
              in: "query",
              required: true,
              style: "form",
              explode: true,
              schema: {
                oneOf: [
                  { type: "string", format: "email" },
                  {
                    type: "array",
                    items: { type: "string", format: "email" },
                    minItems: 1,
                  },
                ],
              },
              description:
                "Teacher email value. Repeat the parameter to provide multiple teachers, e.g. ?teacher=a@x.com&teacher=b@x.com.",
            },
          ],
          responses: {
            "200": {
              description:
                "Successful lookup. Returns students present in every teacher's list.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CommonStudentsResponse",
                  },
                  examples: {
                    singleTeacher: {
                      summary: "Common students for one teacher",
                      value: {
                        students: ["studentjon@gmail.com", "studenthon@gmail.com"],
                      },
                    },
                    multipleTeachers: {
                      summary: "Common students across two teachers",
                      value: {
                        students: [
                          "commonstudent1@gmail.com",
                          "commonstudent2@gmail.com",
                        ],
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Invalid teacher query format.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                  example: {
                    message: "Teacher query parameter is required",
                  },
                },
              },
            },
            "404": {
              description: "At least one teacher cannot be found.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                  example: {
                    message: "Teacher(s) not found: teacherunknown@gmail.com",
                  },
                },
              },
            },
          },
        },
      },
      "/api/suspend": {
        post: {
          tags: ["Teacher Management"],
          summary: "Suspend a student",
          description:
            "Marks a student as suspended. Suspended students are excluded from notification recipients.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuspendRequest",
                },
                examples: {
                  suspendStudent: {
                    summary: "Suspend a single student by email",
                    value: {
                      student: "studentmary@gmail.com",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "204": {
              description:
                "Student suspension succeeded. No response body is returned.",
            },
            "400": {
              description: "Validation error on input payload.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
            "404": {
              description: "Student is not found.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                  example: {
                    message: "Student not found: studentnotexist@gmail.com",
                  },
                },
              },
            },
          },
        },
      },
      "/api/retrievefornotifications": {
        post: {
          tags: ["Teacher Management"],
          summary: "Retrieve recipient list for notifications",
          description:
            "Returns unique active recipients based on a teacher's registered students plus active students mentioned in the message with @email syntax.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/RetrieveForNotificationsRequest",
                },
                examples: {
                  withMentions: {
                    summary: "Notification with mentioned students",
                    value: {
                      teacher: "teacherken@gmail.com",
                      notification:
                        "Hello students! @studentagnes@gmail.com @studentmiche@gmail.com",
                    },
                  },
                  noMentions: {
                    summary: "Notification without explicit mentions",
                    value: {
                      teacher: "teacherken@gmail.com",
                      notification: "Hello class, please submit your homework.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description:
                "Recipient resolution succeeded and returns unique active recipients.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/RetrieveForNotificationsResponse",
                  },
                  example: {
                    recipients: [
                      "studentjon@gmail.com",
                      "studenthon@gmail.com",
                      "studentmiche@gmail.com",
                    ],
                  },
                },
              },
            },
            "400": {
              description: "Validation error on input payload.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                },
              },
            },
            "404": {
              description: "Teacher is not found.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ErrorResponse",
                  },
                  example: {
                    message: "Teacher not found: teacherunknown@gmail.com",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;
