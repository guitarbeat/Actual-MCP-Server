import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduleHandler } from './schedule-handler.js';
import * as actualApi from '../../../actual-api.js';
import { EntityErrorBuilder } from '../errors/entity-error-builder.js';

vi.mock('../../../actual-api.js');

describe('ScheduleHandler', () => {
  let scheduleHandler: ScheduleHandler;

  beforeEach(() => {
    scheduleHandler = new ScheduleHandler();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a schedule with valid data', async () => {
      const data = {
        name: 'Test Schedule',
        accountId: 'f6a5cc2a-5db0-4439-a738-99a539d5c580',
        amount: 1000,
        nextDate: '2025-12-01',
        rule: 'every month',
      };
      const expectedId = 'new-schedule-id';
      vi.mocked(actualApi.createSchedule).mockResolvedValue(expectedId);

      const result = await scheduleHandler.create(data);

      expect(actualApi.createSchedule).toHaveBeenCalledWith(data);
      expect(result).toBe(expectedId);
    });
  });

  describe('update', () => {
    it('should update a schedule with valid data', async () => {
      const id = 'schedule-1';
      const data = {
        name: 'Test Schedule',
        accountId: 'f6a5cc2a-5db0-4439-a738-99a539d5c580',
        amount: 1000,
        nextDate: '2025-12-01',
        rule: 'every month',
      };
      vi.mocked(actualApi.updateSchedule).mockResolvedValue(undefined);

      await scheduleHandler.update(id, data);

      expect(actualApi.updateSchedule).toHaveBeenCalledWith(id, data);
    });
  });

  describe('delete', () => {
    it('should delete a schedule by id', async () => {
      const id = 'schedule-1';
      vi.mocked(actualApi.deleteSchedule).mockResolvedValue(undefined);

      await scheduleHandler.delete(id);

      expect(actualApi.deleteSchedule).toHaveBeenCalledWith(id);
    });
  });

  describe('validate', () => {
    it('should throw an error if id is missing for update', () => {
      expect(() => scheduleHandler.validate('update', undefined, {})).toThrow();
    });

    it('should throw an error if id is missing for delete', () => {
      expect(() => scheduleHandler.validate('delete', undefined)).toThrow();
    });

    it('should throw an error if data is missing for create', () => {
      expect(() => scheduleHandler.validate('create')).toThrow();
    });

    it('should throw an error if data is missing for update', () => {
      expect(() => scheduleHandler.validate('update', 'some-id', undefined)).toThrow();
    });
  });
});
