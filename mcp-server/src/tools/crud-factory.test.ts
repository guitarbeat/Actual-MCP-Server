import { describe, expect, it } from 'vitest';
import { entityConfigurations } from './crud-factory-config.js';
import { createUnifiedCRUDTool, createCRUDTools } from './crud-factory.js';

describe('createUnifiedCRUDTool', () => {
  const entityToolCases = [
    {
      key: 'category',
      config: entityConfigurations.category,
      tool: createUnifiedCRUDTool(entityConfigurations.category),
    },
    {
      key: 'payee',
      config: entityConfigurations.payee,
      tool: createUnifiedCRUDTool(entityConfigurations.payee),
    },
    {
      key: 'tag',
      config: entityConfigurations.tag,
      tool: createUnifiedCRUDTool(entityConfigurations.tag),
    },
    {
      key: 'account',
      config: entityConfigurations.account,
      tool: createUnifiedCRUDTool(entityConfigurations.account),
    },
    {
      key: 'rule',
      config: entityConfigurations.rule,
      tool: createUnifiedCRUDTool(entityConfigurations.rule),
    },
    {
      key: 'categoryGroup',
      config: entityConfigurations.categoryGroup,
      tool: createUnifiedCRUDTool(entityConfigurations.categoryGroup),
    },
  ] as const;

  describe.each(entityToolCases)('manage-$key', ({ config, tool }) => {
    it('should produce a single tool named manage-{entity}', () => {
      expect(tool.schema.name).toBe(`manage-${config.entityName}`);
    });

    it('should have an action enum in the input schema', () => {
      const schema = tool.schema.inputSchema as Record<string, unknown>;
      const properties = schema.properties as Record<string, unknown>;
      const action = properties.action as Record<string, unknown>;
      expect(action.type).toBe('string');
      expect(action.enum).toEqual(['create', 'update', 'delete']);
    });

    it('should only require the action field', () => {
      const schema = tool.schema.inputSchema as Record<string, unknown>;
      expect(schema.required).toEqual(['action']);
    });

    it('should include all properties from create, update, and delete schemas', () => {
      const schema = tool.schema.inputSchema as Record<string, unknown>;
      const properties = schema.properties as Record<string, unknown>;
      expect(Object.keys(properties)).toContain('action');
      expect(Object.keys(properties)).toContain('id');
    });

    it('should set additionalProperties to false', () => {
      const schema = tool.schema.inputSchema as Record<string, unknown>;
      expect(schema.additionalProperties).toBe(false);
    });

    it('should be a write tool', () => {
      expect(tool.requiresWrite).toBe(true);
    });

    it('should include all three action descriptions', () => {
      expect(tool.schema.description).toContain('action: "create"');
      expect(tool.schema.description).toContain('action: "update"');
      expect(tool.schema.description).toContain('action: "delete"');
    });
  });

  it('should produce 6 tools (one per entity) instead of 18', () => {
    const unifiedTools = entityToolCases.map(({ tool }) => tool);
    const legacyTools = [
      ...createCRUDTools(entityConfigurations.category),
      ...createCRUDTools(entityConfigurations.payee),
      ...createCRUDTools(entityConfigurations.tag),
      ...createCRUDTools(entityConfigurations.account),
      ...createCRUDTools(entityConfigurations.rule),
      ...createCRUDTools(entityConfigurations.categoryGroup),
    ];
    expect(unifiedTools).toHaveLength(6);
    expect(legacyTools).toHaveLength(18);
  });

  it('should reject invalid action values', async () => {
    const tool = createUnifiedCRUDTool(entityConfigurations.category);
    const result = await tool.handler({ action: 'invalid' });
    const content = result.content[0];
    expect(result.isError).toBe(true);
    expect(content.type === 'text' && content.text).toContain('Invalid action');
  });

  it('should reject missing action', async () => {
    const tool = createUnifiedCRUDTool(entityConfigurations.category);
    const result = await tool.handler({ name: 'Test' });
    const content = result.content[0];
    expect(result.isError).toBe(true);
    expect(content.type === 'text' && content.text).toContain('Invalid action');
  });
});

describe('CRUD Factory Configuration Schemas', () => {
  describe('Category Schemas', () => {
    const { create, update } = entityConfigurations.category;

    it('should fail when category name is too long on create', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        groupId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Category name must be less than 100 characters',
        );
      }
    });

    it('should fail when category name is too long on update', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'a'.repeat(101),
      };
      const result = update.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Category name must be less than 100 characters',
        );
      }
    });
  });

  describe('Payee Schemas', () => {
    const { create, update } = entityConfigurations.payee;

    it('should fail when payee name is too long on create', () => {
      const invalidData = { name: 'a'.repeat(101) };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Payee name must be less than 100 characters',
        );
      }
    });

    it('should fail when payee name is too long on update', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'a'.repeat(101),
      };
      const result = update.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Payee name must be less than 100 characters',
        );
      }
    });
  });

  describe('Account Schemas', () => {
    const { create, update } = entityConfigurations.account;

    it('should fail when account name is too long on create', () => {
      const invalidData = { name: 'a'.repeat(101), type: 'checking' };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Account name must be less than 100 characters',
        );
      }
    });

    it('should fail when account name is too long on update', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'a'.repeat(101),
      };
      const result = update.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Account name must be less than 100 characters',
        );
      }
    });

    it('should accept nullable balanceCurrent on update', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        balanceCurrent: null,
      };
      const result = update.schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Tag Schemas', () => {
    const { create, update } = entityConfigurations.tag;

    it('should fail when tag label is too long on create', () => {
      const invalidData = { tag: 'a'.repeat(101) };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Tag label must be less than 100 characters',
        );
      }
    });

    it('should accept nullable tag fields on update', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        color: null,
        description: null,
      };
      const result = update.schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('Category Group Schemas', () => {
    const { create, update } = entityConfigurations.categoryGroup;

    it('should fail when category group name is too long on create', () => {
      const invalidData = { name: 'a'.repeat(101) };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Category group name must be less than 100 characters',
        );
      }
    });

    it('should fail when category group name is too long on update', () => {
      const invalidData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'a'.repeat(101),
      };
      const result = update.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'Category group name must be less than 100 characters',
        );
      }
    });
  });

  describe('Rule Schemas', () => {
    const { create, update } = entityConfigurations.rule;

    it('should fail when rule has no conditions', () => {
      const invalidData = {
        conditions: [],
        actions: [{ type: 'set-category', value: '123e4567-e89b-12d3-a456-426614174000' }],
        conditionsOp: 'and',
      };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one condition is required');
      }
    });

    it('should fail when rule has no actions', () => {
      const invalidData = {
        conditions: [{ field: 'payee', op: 'is', value: 'Test' }],
        actions: [],
        conditionsOp: 'and',
      };
      const result = create.schema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('At least one action is required');
      }
    });

    it('should accept valid rule on update', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        conditions: [{ field: 'payee', op: 'is', value: 'Updated Payee' }],
      };
      const result = update.schema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
