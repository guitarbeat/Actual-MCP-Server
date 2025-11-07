import { successWithJson, errorFromCatch, unsupportedFeatureError } from '../../../core/response/index.js';
import { getSchedules } from '../../../actual-api.js';

const API_UNAVAILABLE_ERROR_FRAGMENT = 'not available in this version of the API';
const METHOD_NOT_FUNCTION_FRAGMENT = 'is not a function';

export const schema = {
  name: 'get-schedules',
  description:
    'Retrieve all recurring transaction schedules.\n\n' +
    'EXAMPLE:\n' +
    '- Get all: {}\n\n' +
    'COMMON USE CASES:\n' +
    '- List all recurring transaction schedules\n' +
    '- View schedule details (frequency, amount, next date)\n' +
    '- Find schedule IDs for updating or deleting schedules\n' +
    '- Understand recurring transaction patterns\n' +
    '- Review scheduled transactions\n\n' +
    'SEE ALSO:\n' +
    '- Use with manage-entity to create, update, or delete schedules\n' +
    '- Use with get-accounts to see account details for schedules\n\n' +
    'RETURNS:\n' +
    '- Schedule ID, name, account, amount, next date, frequency\n' +
    '- Schedules create transactions automatically\n\n' +
    'NOTE:\n' +
    '- May not be available on all Actual Budget server versions',
  inputSchema: {
    type: 'object',
    description:
      'This tool does not accept any arguments. Returns all recurring transaction schedules including their frequency, amount, account, and next occurrence date.',
    properties: {},
  },
};

export async function handler(
  _args: Record<string, unknown>
): Promise<ReturnType<typeof successWithJson> | ReturnType<typeof errorFromCatch>> {
  try {
    const schedules = await getSchedules();

    return successWithJson(schedules);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (
      errorMessage.includes(API_UNAVAILABLE_ERROR_FRAGMENT) ||
      errorMessage.includes(METHOD_NOT_FUNCTION_FRAGMENT) ||
      err instanceof TypeError
    ) {
      return unsupportedFeatureError('Reading recurring schedules', {
        suggestion:
          'Upgrade your Actual Budget server to a version that exposes schedule APIs or manage schedules directly in the Actual app.',
      });
    }

    return errorFromCatch(err, {
      fallbackMessage: 'Failed to retrieve schedules from Actual.',
      suggestion: 'Verify the Actual Budget server is reachable and that your user can read schedules before retrying.',
    });
  }
}
