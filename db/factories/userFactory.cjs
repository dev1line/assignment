"use strict";

const { faker } = require("@faker-js/faker");

function teacherFactory(overrides = {}) {
  return {
    email: faker.internet.email().toLowerCase(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function studentFactory(overrides = {}) {
  return {
    email: faker.internet.email().toLowerCase(),
    is_suspended: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

module.exports = {
  teacherFactory,
  studentFactory,
};
