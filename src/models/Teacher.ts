import {
  BelongsToManyAddAssociationsMixin,
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
  Model,
} from "sequelize";
import sequelize from "../config/database";
import type Student from "./Student";

class Teacher extends Model<
  InferAttributes<Teacher>,
  InferCreationAttributes<Teacher>
> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare Students?: NonAttribute<Student[]>;
  declare addStudents: BelongsToManyAddAssociationsMixin<Student, number>;
}

Teacher.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "teachers",
    timestamps: true,
  },
);

export default Teacher;
