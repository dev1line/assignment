import {
  FindOptions,
  FindOrCreateOptions,
  Model,
  ModelStatic,
} from "sequelize";
import { BaseRepositoryContract } from "../types/types";

export default class BaseRepository<
  TModel extends Model,
> implements BaseRepositoryContract<TModel> {
  protected model: ModelStatic<TModel>;

  constructor(model: ModelStatic<TModel>) {
    this.model = model;
  }

  async findOne(options: FindOptions): Promise<TModel | null> {
    return this.model.findOne(options);
  }

  async findAll(options: FindOptions): Promise<TModel[]> {
    return this.model.findAll(options);
  }

  async findOrCreate(options: FindOrCreateOptions): Promise<[TModel, boolean]> {
    return this.model.findOrCreate(options);
  }
}
