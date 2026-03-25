import { createCRUDTools } from '../../tools/crud-factory.js';
import { entityConfigurations } from '../../tools/crud-factory-config.js';
import { defineLegacyTools } from './common.js';

export const crudToolDefinitions = defineLegacyTools([
  ...createCRUDTools(entityConfigurations.category),
  ...createCRUDTools(entityConfigurations.payee),
  ...createCRUDTools(entityConfigurations.account),
  ...createCRUDTools(entityConfigurations.rule),
  ...createCRUDTools(entityConfigurations.categoryGroup),
]);
