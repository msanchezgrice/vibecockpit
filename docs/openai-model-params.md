# OpenAI Responses API - Recommended Parameters

This document provides guidance on optimal parameters when migrating from the OpenAI Chat Completions API to the Responses API.

## Model Mapping

| Chat Completions Model | Responses API Model |
|------------------------|---------------------|
| gpt-3.5-turbo          | o3-mini             |
| gpt-4-turbo            | o3                  |
| gpt-4o                 | o3                  |

## Parameter Mapping

| Chat Completions Parameter | Responses API Parameter | Notes |
|---------------------------|-------------------------|-------|
| `messages`                 | `input`                 | Simplified input format |
| `model`                    | `model`                 | Use the model mapping above |
| `temperature`              | `temperature`           | Same behavior |
| `max_tokens`               | `max_tokens`            | Same behavior |
| `tools`                    | `tools`                 | Same structure but different parsing |
| `tool_choice`              | `tool_choice`           | Same structure |
| N/A                        | `instructions`          | New parameter for system context |

## Recommended Settings by Use Case

### General Content Generation
```typescript
// Chat Completions API
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: prompt }],
  temperature: 0.7,
  max_tokens: 1000,
});

// Responses API
const response = await openai.responses.create({
  model: 'o3-mini',  // Lower cost option
  input: prompt,
  temperature: 0.7,
  max_tokens: 1000,
});
```

### Tool Calling (Function Calling)
```typescript
// Chat Completions API
const response = await openai.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: [{ role: 'user', content: prompt }],
  tools: [...toolDefinitions],
  tool_choice: 'auto',
  temperature: 0.2,  // Lower temperature for more deterministic outputs
});

// Responses API
const response = await openai.responses.create({
  model: 'o3',
  input: prompt,
  tools: [...toolDefinitions],
  tool_choice: 'auto',
  temperature: 0.2,
  instructions: 'Use the provided tools to respond accurately.',  // New parameter
});
```

### Complex Reasoning
```typescript
// Chat Completions API
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  temperature: 0.4,
  max_tokens: 2000,
});

// Responses API
const response = await openai.responses.create({
  model: 'o3',
  input: userPrompt,
  instructions: systemPrompt,  // System prompt moved to instructions
  temperature: 0.4,
  max_tokens: 2000,
});
```

## Response Handling Changes

### Chat Completions API Response Structure
```typescript
const choice = response.choices[0];
const content = choice.message?.content || '';

// Tool calls
if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
  const toolCall = choice.message.tool_calls[0];
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);
  // Process tool call...
}
```

### Responses API Response Structure
```typescript
// Direct text output
const content = response.output_text || '';

// Tool calls
if (response.tool_calls && response.tool_calls.length > 0) {
  const toolCall = response.tool_calls[0];
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(toolCall.function.arguments);
  // Process tool call...
}
```

## Performance Considerations

- The Responses API typically offers lower latency compared to Chat Completions
- The o3 models are optimized for improved reasoning and tool usage
- For most cases, a temperature between 0.2-0.5 provides the best balance of creativity vs determinism
- When using tool calling, consider setting `max_tokens` higher than needed to ensure complete function arguments

## Cost Comparison

| Chat Completions Model | Price/1K tokens (input) | Price/1K tokens (output) | Responses API Model | Price/1K tokens (input) | Price/1K tokens (output) |
|------------------------|--------------------------|--------------------------|--------------------|--------------------------|--------------------------|
| gpt-3.5-turbo          | $0.0015                  | $0.002                   | o3-mini            | $0.0015                  | $0.002                   |
| gpt-4-turbo            | $0.01                    | $0.03                    | o3                 | $0.01                    | $0.03                    |
| gpt-4o                 | $0.01                    | $0.03                    | o3                 | $0.01                    | $0.03                    |

The pricing structure remains similar between the APIs. 