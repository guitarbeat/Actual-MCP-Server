# Resource Error Handling Fix

## Issue
Resource reading was returning empty error messages: "Error: Failed to initialize Actual Budget API. "

## Root Cause
The error handling was not properly extracting error messages from various error types, and wasn't providing helpful context about what went wrong.

## Fix Applied

### Improved Error Message Extraction
- Now handles multiple error types: `Error` objects, strings, and other types
- Extracts error messages, stack traces, and provides fallbacks
- Handles cases where error messages might be empty

### Added Contextual Suggestions
Based on the error message content, provides helpful suggestions:
- **Connection errors**: Suggests checking `ACTUAL_SERVER_URL` and server status
- **Authentication errors**: Suggests verifying `ACTUAL_PASSWORD`
- **Budget errors**: Suggests ensuring at least one budget exists
- **Generic errors**: Suggests checking server logs

### Error Format
Errors now return detailed information:
```
Error: Failed to initialize Actual Budget API.

[Error message here]

Suggestion: [Contextual help]

Stack trace:
[If available in development]
```

## Testing
After restarting the MCP server, resource reading errors should now:
1. Show the actual error message (not empty)
2. Provide helpful suggestions based on error type
3. Include stack traces in development mode for debugging

## Next Steps
If errors persist, the improved error messages will help identify:
- Missing environment variables
- Connection issues
- Authentication problems
- Budget configuration issues

