/**
 * LLM Client for transaction categorization
 * Handles API communication with OpenAI or compatible LLM services
 */

import OpenAI from 'openai';
import { handleLLMError } from './handle-errors.js';

export interface LLMClientConfig {
  apiKey: string;
  model: string;
  maxRetries?: number;
  timeout?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM Client with retry logic and error handling
 */
export class LLMClient {
  private client: OpenAI;
  private model: string;
  private maxRetries: number;

  constructor(config: LLMClientConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
    });
    this.model = config.model;
    this.maxRetries = config.maxRetries || 3;
  }

  /**
   * Send a prompt to the LLM with exponential backoff retry logic
   */
  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
            { role: 'user' as const, content: prompt },
          ],
          temperature: 0.3, // Lower temperature for more consistent categorization
          max_tokens: 100, // Categories are short
        });

        const content = response.choices[0]?.message?.content?.trim() || '';
        
        return {
          content,
          usage: response.usage ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          } : undefined,
        };
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          // Wrap with our error handler for better error messages
          throw handleLLMError(error, { attempt: attempt + 1, maxRetries: this.maxRetries });
        }

        // Exponential backoff: 1s, 2s, 4s
        if (attempt < this.maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`⚠️  LLM API call failed (attempt ${attempt + 1}/${this.maxRetries}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted, wrap the error
    const wrappedError = handleLLMError(lastError!, { 
      attempt: this.maxRetries, 
      maxRetries: this.maxRetries,
      message: 'All retry attempts exhausted'
    });
    throw wrappedError;
  }

  /**
   * Check if an error should not be retried
   */
  private isNonRetryableError(error: unknown): boolean {
    if (error instanceof OpenAI.APIError) {
      // Don't retry on authentication or invalid request errors
      return error.status === 401 || error.status === 400;
    }
    return false;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
