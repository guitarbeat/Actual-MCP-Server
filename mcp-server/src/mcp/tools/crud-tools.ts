import { createCRUDTools } from '../../tools/crud-factory.js';
import { entityConfigurations } from '../../tools/crud-factory-config.js';
import { defineLegacyTool } from './common.js';

export const crudToolDefinitions = createCRUDTools(entityConfigurations.category)
  .concat(
    createCRUDTools(entityConfigurations.payee),
    createCRUDTools(entityConfigurations.tag),
    createCRUDTools(entityConfigurations.account),
    createCRUDTools(entityConfigurations.rule),
    createCRUDTools(entityConfigurations.categoryGroup),
  )
  .map((tool) => defineLegacyTool(tool));
