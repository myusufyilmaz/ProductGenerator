---
title: "Dynamic Agents"
description: Dynamically configure your agent's instruction, model and tools using runtime context.
---

# Dynamic Agents
[EN] Source: https://mastra.ai/en/docs/agents/dynamic-agents

Dynamic agents use [runtime context](./runtime-variables), like user IDs and other important parameters, to adjust their settings in real-time.

This means they can change the model they use, update their instructions, and select different tools as needed.

By using this context, agents can better respond to each user's needs. They can also call any API to gather more information, which helps improve what the agents can do.

### Example Configuration

Here's an example of a dynamic support agent that adjusts its behavior based on the user's subscription tier and language preferences:

```typescript
const supportAgent = new Agent({
  name: "Dynamic Support Agent",

  instructions: async ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    const language = runtimeContext.get("language");

    return `You are a customer support agent for our SaaS platform.
    The current user is on the ${userTier} tier and prefers ${language} language.
    
    For ${userTier} tier users:
    ${userTier === "free" ? "- Provide basic support and documentation links" : ""}
    ${userTier === "pro" ? "- Offer detailed technical support and best practices" : ""}
    ${userTier === "enterprise" ? "- Provide priority support with custom solutions" : ""}
    
    Always respond in ${language} language.`;
  },

  model: ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    return userTier === "enterprise"
      ? openai("gpt-4")
      : openai("gpt-3.5-turbo");
  },

  tools: ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    const baseTools = [knowledgeBase, ticketSystem];

    if (userTier === "pro" || userTier === "enterprise") {
      baseTools.push(advancedAnalytics);
    }

    if (userTier === "enterprise") {
      baseTools.push(customIntegration);
    }

    return baseTools;
  },
});
```

In this example, the agent:

- Adjusts its instructions based on the user's subscription tier (free, pro, or enterprise)
- Uses a more powerful model (GPT-4) for enterprise users
- Provides different sets of tools based on the user's tier
- Responds in the user's preferred language

This demonstrates how a single agent can handle different types of users and scenarios by leveraging runtime context, making it more flexible and maintainable than creating separate agents for each use case.

For a complete implementation example including API routes, middleware setup, and runtime context handling, see our [Dynamic Agents Example](/examples/agents/dynamic-agents).


---
title: "Agent Overview | Agent Documentation | Mastra"
description: Overview of agents in Mastra, detailing their capabilities and how they interact with tools, workflows, and external systems.
---

# Using Agents
[EN] Source: https://mastra.ai/en/docs/agents/overview

**Agents** are one of the core Mastra primitives. Agents use a language model to decide on a sequence of actions. They can call functions (known as _tools_). You can compose them with *workflows* (the other main Mastra primitive), either by giving an agent a workflow as a tool, or by running an agent from within a workflow.

Agents can run autonomously in a loop, run once, or take turns with a user. You can give short-term, long-term, and working memory of their user interactions. They can stream text or return structured output (ie, JSON). They can access third-party APIs, query knowledge bases, and so on.

## 1. Creating an Agent

To create an agent in Mastra, you use the `Agent` class and define its properties:

```ts showLineNumbers filename="src/mastra/agents/index.ts" copy
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const myAgent = new Agent({
  name: "My Agent",
  instructions: "You are a helpful assistant.",
  model: openai("gpt-4o-mini"),
});
```

**Note:** Ensure that you have set the necessary environment variables, such as your OpenAI API key, in your `.env` file:

```.env filename=".env" copy
OPENAI_API_KEY=your_openai_api_key
```

Also, make sure you have the `@mastra/core` package installed:

```bash npm2yarn copy
npm install @mastra/core@latest
```

### Registering the Agent

Register your agent with Mastra to enable logging and access to configured tools and integrations:

```ts showLineNumbers filename="src/mastra/index.ts" copy
import { Mastra } from "@mastra/core";
import { myAgent } from "./agents";

export const mastra = new Mastra({
  agents: { myAgent },
});
```

## 2. Generating and streaming text

### Generating text

Use the `.generate()` method to have your agent produce text responses:

```ts showLineNumbers filename="src/mastra/index.ts" copy
const response = await myAgent.generate([
  { role: "user", content: "Hello, how can you assist me today?" },
]);

console.log("Agent:", response.text);
```

For more details about the generate method and its options, see the [generate reference documentation](/reference/agents/generate).

### Streaming responses

For more real-time responses, you can stream the agent's response:

```ts showLineNumbers filename="src/mastra/index.ts" copy
const stream = await myAgent.stream([
  { role: "user", content: "Tell me a story." },
]);

console.log("Agent:");

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

For more details about streaming responses, see the [stream reference documentation](/reference/agents/stream).

## 3. Structured Output

Agents can return structured data by providing a JSON Schema or using a Zod schema.

### Using JSON Schema

```typescript
const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
  },
  additionalProperties: false,
  required: ["summary", "keywords"],
};

const response = await myAgent.generate(
  [
    {
      role: "user",
      content:
        "Please provide a summary and keywords for the following text: ...",
    },
  ],
  {
    output: schema,
  },
);

console.log("Structured Output:", response.object);
```

### Using Zod

You can also use Zod schemas for type-safe structured outputs.

First, install Zod:

```bash npm2yarn copy
npm install zod
```

Then, define a Zod schema and use it with the agent:

```ts showLineNumbers filename="src/mastra/index.ts" copy
import { z } from "zod";

// Define the Zod schema
const schema = z.object({
  summary: z.string(),
  keywords: z.array(z.string()),
});

// Use the schema with the agent
const response = await myAgent.generate(
  [
    {
      role: "user",
      content:
        "Please provide a summary and keywords for the following text: ...",
    },
  ],
  {
    output: schema,
  },
);

console.log("Structured Output:", response.object);
```

### Using Tools

If you need to generate structured output alongside tool calls, you'll need to use the `experimental_output` property instead of `output`. Here's how:

```typescript
const schema = z.object({
  summary: z.string(),
  keywords: z.array(z.string()),
});

const response = await myAgent.generate(
  [
    {
      role: "user",
      content:
        "Please analyze this repository and provide a summary and keywords...",
    },
  ],
  {
    // Use experimental_output to enable both structured output and tool calls
    experimental_output: schema,
  },
);

console.log("Structured Output:", response.object);
```

<br />

This allows you to have strong typing and validation for the structured data returned by the agent.

## 4. Multi-step tool use

Agents can be enhanced with tools - functions that extend their capabilities beyond text generation. Tools allow agents to perform calculations, access external systems, and process data. Agents not only decide whether to call tools they're given, they determine the parameters that should be given to that tool.

For a detailed guide to creating and configuring tools, see the [Adding Tools documentation](/docs/agents/using-tools-and-mcp), but below are the important things to know.

### Using `maxSteps`

The `maxSteps` parameter controls the maximum number of sequential LLM calls an agent can make, particularly important when using tool calls. By default, it is set to 1 to prevent infinite loops in case of misconfigured tools. You can increase this limit based on your use case:

```ts showLineNumbers filename="src/mastra/agents/index.ts" copy
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import * as mathjs from "mathjs";
import { z } from "zod";

export const myAgent = new Agent({
  name: "My Agent",
  instructions: "You are a helpful assistant that can solve math problems.",
  model: openai("gpt-4o-mini"),
  tools: {
    calculate: {
      description: "Calculator for mathematical expressions",
      schema: z.object({ expression: z.string() }),
      execute: async ({ expression }) => mathjs.evaluate(expression),
    },
  },
});

const response = await myAgent.generate(
  [
    {
      role: "user",
      content:
        "If a taxi driver earns $41 per hour and works 12 hours a day, how much do they earn in one day?",
    },
  ],
  {
    maxSteps: 5, // Allow up to 5 tool usage steps
  },
);
```

### Streaming progress with `onStepFinish`

You can monitor the progress of multi-step operations using the `onStepFinish` callback. This is useful for debugging or providing progress updates to users.

`onStepFinish` is only available when streaming or generating text without structured output.

```ts showLineNumbers filename="src/mastra/agents/index.ts" copy
const response = await myAgent.generate(
  [{ role: "user", content: "Calculate the taxi driver's daily earnings." }],
  {
    maxSteps: 5,
    onStepFinish: ({ text, toolCalls, toolResults }) => {
      console.log("Step completed:", { text, toolCalls, toolResults });
    },
  },
);
```

### Detecting completion with `onFinish`

The `onFinish` callback is available when streaming responses and provides detailed information about the completed interaction. It is called after the LLM has finished generating its response and all tool executions have completed.
This callback receives the final response text, execution steps, token usage statistics, and other metadata that can be useful for monitoring and logging:

```ts showLineNumbers filename="src/mastra/agents/index.ts" copy
const stream = await myAgent.stream(
  [{ role: "user", content: "Calculate the taxi driver's daily earnings." }],
  {
    maxSteps: 5,
    onFinish: ({
      steps,
      text,
      finishReason, // 'complete', 'length', 'tool', etc.
      usage, // token usage statistics
      reasoningDetails, // additional context about the agent's decisions
    }) => {
      console.log("Stream complete:", {
        totalSteps: steps.length,
        finishReason,
        usage,
      });
    },
  },
);
```

## 5. Testing agents locally

Mastra provides a CLI command `mastra dev` to run your agents behind an API. By default, this looks for exported agents in files in the `src/mastra/agents` directory. It generates endpoints for testing your agent (eg `http://localhost:5000/api/agents/myAgent/generate`) and provides a visual playground where you can chat with an agent and view traces.

For more details, see the [Local Dev Playground](/docs/server-db/local-dev-playground) docs.

## Next Steps

- Learn about Agent Memory in the [Agent Memory](./agent-memory.mdx) guide.
- Learn about Agent Tools in the [Agent Tools and MCP](./using-tools-and-mcp.mdx) guide.
- See an example agent in the [Chef Michel](../../guides/guide/chef-michel.mdx) example.


---
title: "Runtime context | Agents | Mastra Docs"
description: Learn how to use Mastra's dependency injection system to provide runtime configuration to agents and tools.
---

# Agent Runtime Context
[EN] Source: https://mastra.ai/en/docs/agents/runtime-variables

Mastra provides runtime context, which is a system based on dependency injection that enables you to configure your agents and tools with runtime variables. If you find yourself creating several different agents that do very similar things, runtime context allows you to combine them into one agent.

## Overview

The dependency injection system allows you to:

1. Pass runtime configuration variables to agents through a type-safe runtimeContext
2. Access these variables within tool execution contexts
3. Modify agent behavior without changing the underlying code
4. Share configuration across multiple tools within the same agent

## Basic Usage

```typescript
const agent = mastra.getAgent("weatherAgent");

// Define your runtimeContext's type structure
type WeatherRuntimeContext = {
  "temperature-scale": "celsius" | "fahrenheit"; // Fixed typo in "fahrenheit"
};

const runtimeContext = new RuntimeContext<WeatherRuntimeContext>();
runtimeContext.set("temperature-scale", "celsius");

const response = await agent.generate("What's the weather like today?", {
  runtimeContext,
});

console.log(response.text);
```

## Using with REST API

Here's how to dynamically set temperature units based on a user's location using the Cloudflare `CF-IPCountry` header:

```typescript filename="src/index.ts"
import { Mastra } from "@mastra/core";
import { RuntimeContext } from "@mastra/core/di";
import { agent as weatherAgent } from "./agents/weather";

// Define RuntimeContext type with clear, descriptive types
type WeatherRuntimeContext = {
  "temperature-scale": "celsius" | "fahrenheit";
};

export const mastra = new Mastra({
  agents: {
    weather: weatherAgent,
  },
  server: {
    middleware: [
      async (c, next) => {
        const country = c.req.header("CF-IPCountry");
        const runtimeContext = c.get<WeatherRuntimeContext>("runtimeContext");

        // Set temperature scale based on country
        runtimeContext.set(
          "temperature-scale",
          country === "US" ? "fahrenheit" : "celsius",
        );

        await next(); // Don't forget to call next()
      },
    ],
  },
});
```

## Creating Tools with Variables

Tools can access runtimeContext variables and must conform to the agent's runtimeContext type:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const weatherTool = createTool({
  id: "getWeather",
  description: "Get the current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("The location to get weather for"),
  }),
  execute: async ({ context, runtimeContext }) => {
    // Type-safe access to runtimeContext variables
    const temperatureUnit = runtimeContext.get("temperature-scale");

    const weather = await fetchWeather(context.location, {
      temperatureUnit,
    });

    return { result: weather };
  },
});

async function fetchWeather(
  location: string,
  { temperatureUnit }: { temperatureUnit: "celsius" | "fahrenheit" },
): Promise<WeatherResponse> {
  // Implementation of weather API call
  const response = await weatherApi.fetch(location, temperatureUnit);

  return {
    location,
    temperature: "72°F",
    conditions: "Sunny",
    unit: temperatureUnit,
  };
}
```


---
title: "Using Tools with Agents | Agents | Mastra Docs"
description: Learn how to create tools, add them to Mastra agents, and integrate tools from MCP servers.
---

# Using Tools with Agents
[EN] Source: https://mastra.ai/en/docs/agents/using-tools-and-mcp

Tools are typed functions that can be executed by agents or workflows. Each tool has a schema defining its inputs, an executor function implementing its logic, and optional access to configured integrations.

## Creating Tools

Here's a basic example of creating a tool:

```typescript filename="src/mastra/tools/weatherInfo.ts" copy
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const weatherInfo = createTool({
  id: "Get Weather Information",
  inputSchema: z.object({
    city: z.string(),
  }),
  description: `Fetches the current weather information for a given city`,
  execute: async ({ context: { city } }) => {
    // Tool logic here (e.g., API call)
    console.log("Using tool to fetch weather information for", city);
    return { temperature: 20, conditions: "Sunny" }; // Example return
  },
});
```

For details on creating and designing tools, see the [Tools Overview](/docs/tools-mcp/overview).

## Adding Tools to an Agent

To make a tool available to an agent, add it to the `tools` property in the agent's configuration.

```typescript filename="src/mastra/agents/weatherAgent.ts" {3,11}
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { weatherInfo } from "../tools/weatherInfo";

export const weatherAgent = new Agent({
  name: "Weather Agent",
  instructions:
    "You are a helpful assistant that provides current weather information. When asked about the weather, use the weather information tool to fetch the data.",
  model: openai("gpt-4o-mini"),
  tools: {
    weatherInfo,
  },
});
```

When you call the agent, it can now decide to use the configured tool based on its instructions and the user's prompt.

## Adding MCP Tools to an Agent

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) provides a standardized way for AI models to discover and interact with external tools and resources. You can connect your Mastra agent to MCP servers to use tools provided by third parties.

For more details on MCP concepts and how to set up MCP clients and servers, see the [MCP Overview](/docs/tools-mcp/mcp-overview).

### Installation

First, install the Mastra MCP package:

```bash npm2yarn copy
npm install @mastra/mcp@latest
```

### Using MCP Tools

Because there are so many MCP server registries to choose from, we've created an [MCP Registry Registry](https://mastra.ai/mcp-registry-registry) to help you find MCP servers.

Once you have a server you want to use with your agent, import the Mastra `MCPClient` and add the server configuration.

```typescript filename="src/mastra/mcp.ts" {1,7-16}
import { MCPClient } from "@mastra/mcp";

// Configure MCPClient to connect to your server(s)
export const mcp = new MCPClient({
  servers: {
    filesystem: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Downloads",
      ],
    },
  },
});
```

Then connect your agent to the server tools:

```typescript filename="src/mastra/agents/mcpAgent.ts" {7}
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { mcp } from "../mcp";

// Create an agent and add tools from the MCP client
const agent = new Agent({
  name: "Agent with MCP Tools",
  instructions: "You can use tools from connected MCP servers.",
  model: openai("gpt-4o-mini"),
  tools: await mcp.getTools(),
});
```

For more details on configuring `MCPClient` and the difference between static and dynamic MCP server configurations, see the [MCP Overview](/docs/tools-mcp/mcp-overview).

## Accessing MCP Resources

In addition to tools, MCP servers can also expose resources - data or content that can be retrieved and used in your application.

```typescript filename="src/mastra/resources.ts" {3-8}
import { mcp } from "./mcp";

// Get resources from all connected MCP servers
const resources = await mcp.getResources();

// Access resources from a specific server
if (resources.filesystem) {
  const resource = resources.filesystem.find(
    (r) => r.uri === "filesystem://Downloads",
  );
  console.log(`Resource: ${resource?.name}`);
}
```

Each resource has a URI, name, description, and MIME type. The `getResources()` method handles errors gracefully - if a server fails or doesn't support resources, it will be omitted from the results.

## Accessing MCP Prompts

MCP servers can also expose prompts, which represent structured message templates or conversational context for agents.

### Listing Prompts

```typescript filename="src/mastra/prompts.ts"
import { mcp } from "./mcp";

// Get prompts from all connected MCP servers
const prompts = await mcp.prompts.list();

// Access prompts from a specific server
if (prompts.weather) {
  const prompt = prompts.weather.find(
    (p) => p.name === "current"
  );
  console.log(`Prompt: ${prompt?.name}`);
}
```

Each prompt has a name, description, and (optional) version.

### Retrieving a Prompt and Its Messages

```typescript filename="src/mastra/prompts.ts"
const { prompt, messages } = await mcp.prompts.get({ serverName: "weather", name: "current" });
console.log(prompt);    // { name: "current", version: "v1", ... }
console.log(messages);  // [ { role: "assistant", content: { type: "text", text: "..." } }, ... ]
```

## Exposing Agents as Tools via MCPServer

In addition to using tools from MCP servers, your Mastra Agents themselves can be exposed as tools to any MCP-compatible client using Mastra's `MCPServer`.

When an `Agent` instance is provided to an `MCPServer` configuration:

- It is automatically converted into a callable tool.
- The tool is named `ask_<agentKey>`, where `<agentKey>` is the identifier you used when adding the agent to the `MCPServer`'s `agents` configuration.
- The agent's `description` property (which must be a non-empty string) is used to generate the tool's description.

This allows other AI models or MCP clients to interact with your Mastra Agents as if they were standard tools, typically by "asking" them a question.

**Example `MCPServer` Configuration with an Agent:**

```typescript filename="src/mastra/mcp.ts"
import { Agent } from "@mastra/core/agent";
import { MCPServer } from "@mastra/mcp";
import { openai } from "@ai-sdk/openai";
import { weatherInfo } from "../tools/weatherInfo";
import { generalHelper } from "../agents/generalHelper";

const server = new MCPServer({
  name: "My Custom Server with Agent-Tool",
  version: "1.0.0",
  tools: {
    weatherInfo,
  },
  agents: { generalHelper }, // Exposes 'ask_generalHelper' tool
});
```

For an agent to be successfully converted into a tool by `MCPServer`, its `description` property must be set to a non-empty string in its constructor configuration. If the description is missing or empty, `MCPServer` will throw an error during initialization.

For more details on setting up and configuring `MCPServer`, refer to the [MCPServer reference documentation](/reference/tools/mcp-server).


---
title: "Using with Vercel AI SDK"
description: "Learn how Mastra leverages the Vercel AI SDK library and how you can leverage it further with Mastra"
---

import Image from "next/image";

# Using with Vercel AI SDK
[EN] Source: https://mastra.ai/en/docs/frameworks/agentic-uis/ai-sdk

Mastra leverages AI SDK's model routing (a unified interface on top of OpenAI, Anthropic, etc), structured output, and tool calling.

We explain this in greater detail in [this blog post](https://mastra.ai/blog/using-ai-sdk-with-mastra)

## Mastra + AI SDK

Mastra acts as a layer on top of AI SDK to help teams productionize their proof-of-concepts quickly and easily.

<Image
  src="/image/mastra-ai-sdk.png"
  alt="Agent interaction trace showing spans, LLM calls, and tool executions"
  style={{ maxWidth: "800px", width: "100%", margin: "8px 0" }}
  className="nextra-image rounded-md py-8"
  data-zoom
  width={800}
  height={400}
/>

## Model routing

When creating agents in Mastra, you can specify any AI SDK-supported model:

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

const agent = new Agent({
  name: "WeatherAgent",
  instructions: "Instructions for the agent...",
  model: openai("gpt-4-turbo"), // Model comes directly from AI SDK
});

const result = await agent.generate("What is the weather like?");
```

## AI SDK Hooks

Mastra is compatible with AI SDK's hooks for seamless frontend integration:

### useChat

The `useChat` hook enables real-time chat interactions in your frontend application

- Works with agent data streams i.e. `.toDataStreamResponse()`
- The useChat `api` defaults to `/api/chat`
- Works with the Mastra REST API agent stream endpoint `{MASTRA_BASE_URL}/agents/:agentId/stream` for data streams,
  i.e. no structured output is defined.

```typescript filename="app/api/chat/route.ts" copy
import { mastra } from "@/src/mastra";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  const stream = await myAgent.stream(messages);

  return stream.toDataStreamResponse();
}
```

```typescript copy
import { useChat } from '@ai-sdk/react';

export function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/path-to-your-agent-stream-api-endpoint'
  });

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.role}: {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
        />
      </form>
    </div>
  );
}
```

> **Gotcha**: When using `useChat` with agent memory functionality, make sure to check out the [Agent Memory section](/docs/agents/agent-memory#usechat) for important implementation details.

### useCompletion

For single-turn completions, use the `useCompletion` hook:

- Works with agent data streams i.e. `.toDataStreamResponse()`
- The useCompletion `api` defaults to `/api/completion`
- Works with the Mastra REST API agent stream endpoint `{MASTRA_BASE_URL}/agents/:agentId/stream` for data streams,
  i.e. no structured output is defined.

```typescript filename="app/api/completion/route.ts" copy
import { mastra } from "@/src/mastra";

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  const stream = await myAgent.stream([{ role: "user", content: prompt }]);

  return stream.toDataStreamResponse();
}
```

```typescript
import { useCompletion } from "@ai-sdk/react";

export function CompletionComponent() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
  } = useCompletion({
  api: '/path-to-your-agent-stream-api-endpoint'
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Enter a prompt..."
        />
      </form>
      <p>Completion result: {completion}</p>
    </div>
  );
}
```

### useObject

For consuming text streams that represent JSON objects and parsing them into a complete object based on a schema.

- Works with agent text streams i.e. `.toTextStreamResponse()`
- Works with the Mastra REST API agent stream endpoint `{MASTRA_BASE_URL}/agents/:agentId/stream` for text streams,
  i.e. structured output is defined.

```typescript filename="app/api/use-object/route.ts" copy
import { mastra } from "@/src/mastra";

export async function POST(req: Request) {
  const body = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  const stream = await myAgent.stream(body, {
    output: z.object({
      weather: z.string(),
    }),
  });

  return stream.toTextStreamResponse();
}
```

```typescript
import { experimental_useObject as useObject } from '@ai-sdk/react';

export default function Page() {
  const { object, submit } = useObject({
    api: '/api/use-object',
    schema: z.object({
      weather: z.string(),
    }),
  });

  return (
    <div>
      <button onClick={() => submit('example input')}>Generate</button>
      {object?.weather && <p>{object.weather}</p>}
    </div>
  );
}
```

### With additional data / RuntimeContext

You can send additional data via the UI hooks that can be leveraged in Mastra as RuntimeContext using the `sendExtraMessageFields` option.

#### Frontend: Using sendExtraMessageFields

```typescript
import { useChat } from '@ai-sdk/react';

export function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    sendExtraMessageFields: true, // Enable sending extra fields
  });

  const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();        
        handleSubmit(e,{
            // Add context data to the message
            data: {
                userId: 'user123',
                preferences: { language: 'en', temperature: 'celsius' },
            },
        });
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```

#### Backend: Handling in API Route

```typescript filename="app/api/chat/route.ts" copy
import { mastra } from "@/src/mastra";
import { RuntimeContext } from "@mastra/core/runtime-context";

export async function POST(req: Request) {
  const { messages, data } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  
  const runtimeContext = new RuntimeContext();
  
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      runtimeContext.set(key, value);
    });
  }
  
  const stream = await myAgent.stream(messages, { runtimeContext });
  return stream.toDataStreamResponse();
}
```

#### Alternative: Server Middleware

You can also handle this at the server middleware level:

```typescript filename="src/mastra/index.ts" copy
import { Mastra } from "@mastra/core";

export const mastra = new Mastra({
  agents: { weatherAgent },
  server: {
    middleware: [
      async (c, next) => {
        const runtimeContext = c.get("runtimeContext");
        
        if (c.req.method === 'POST') {
          try {
            // Clone the request since reading the body can only be done once
            const clonedReq = c.req.raw.clone();
            const body = await clonedReq.json();
            
            
            if (body?.data) {
              Object.entries(body.data).forEach(([key, value]) => {
                runtimeContext.set(key, value);
              });
            }
          } catch {
            // Continue without additional data
          }
        }
        
        await next();
      },
    ],
  },
});
```

You can then access this data in your tools via the `runtimeContext` parameter. See the [Runtime Context documentation](/docs/agents/runtime-variables) for more details.

## Tool Calling

### AI SDK Tool Format

Mastra supports tools created using the AI SDK format, so you can use
them directly with Mastra agents. See our tools doc on [Vercel AI SDK Tool Format
](/docs/agents/adding-tools#vercel-ai-sdk-tool-format) for more details.

### Client-side tool calling

Mastra leverages AI SDK's tool calling, so what applies in AI SDK applies here still.
[Agent Tools](/docs/agents/adding-tools) in Mastra are 100% percent compatible with AI SDK tools.

Mastra tools also expose an optional `execute` async function. It is optional because you might want to forward tool calls to the client or to a queue instead of executing them in the same process.

One way to then leverage client-side tool calling is to use the `@ai-sdk/react` `useChat` hook's `onToolCall` property for
client-side tool execution

## Custom DataStream

In certain scenarios you need to write custom data, message annotations to an agent's dataStream.
This can be useful for:

- Streaming additional data to the client
- Passing progress info back to the client in real time

Mastra integrates well with AI SDK to make this possible

### CreateDataStream

The `createDataStream` function allows you to stream additional data to the client

```typescript copy
import { createDataStream } from "ai";
import { Agent } from "@mastra/core/agent";

export const weatherAgent = new Agent({
  name: "Weather Agent",
  instructions: `
          You are a helpful weather assistant that provides accurate weather information.

          Your primary function is to help users get weather details for specific locations. When responding:
          - Always ask for a location if none is provided
          - If the location name isn't in English, please translate it
          - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
          - Include relevant details like humidity, wind conditions, and precipitation
          - Keep responses concise but informative

          Use the weatherTool to fetch current weather data.
    `,
  model: openai("gpt-4o"),
  tools: { weatherTool },
});

const stream = createDataStream({
  async execute(dataStream) {
    // Write data
    dataStream.writeData({ value: "Hello" });

    // Write annotation
    dataStream.writeMessageAnnotation({ type: "status", value: "processing" });

    //mastra agent stream
    const agentStream = await weatherAgent.stream("What is the weather");

    // Merge agent stream
    agentStream.mergeIntoDataStream(dataStream);
  },
  onError: (error) => `Custom error: ${error.message}`,
});
```

### CreateDataStreamResponse

The `createDataStreamResponse` function creates a Response object that streams data to the client

```typescript filename="app/api/chat/route.ts" copy
import { mastra } from "@/src/mastra";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const myAgent = mastra.getAgent("weatherAgent");
  //mastra agent stream
  const agentStream = await myAgent.stream(messages);

  const response = createDataStreamResponse({
    status: 200,
    statusText: "OK",
    headers: {
      "Custom-Header": "value",
    },
    async execute(dataStream) {
      // Write data
      dataStream.writeData({ value: "Hello" });

      // Write annotation
      dataStream.writeMessageAnnotation({
        type: "status",
        value: "processing",
      });

      // Merge agent stream
      agentStream.mergeIntoDataStream(dataStream);
    },
    onError: (error) => `Custom error: ${error.message}`,
  });

  return response;
}
```


---
title: Using with Assistant UI
description: "Learn how to integrate Assistant UI with Mastra"
---

import { Callout, FileTree, Steps } from 'nextra/components'

## Integration Guide

Run Mastra as a standalone server and connect your Next.js frontend (with Assistant UI) to its API endpoints.

<Steps>
### Create Standalone Mastra Server

Set up your directory structure. A possible directory structure could look like this:

<FileTree>
    <FileTree.Folder name="project-root" defaultOpen>
        <FileTree.Folder name="mastra-server" defaultOpen>
            <FileTree.Folder name="src">
                <FileTree.Folder name="mastra" />
            </FileTree.Folder>
            <FileTree.File name="package.json" />
        </FileTree.Folder>
        <FileTree.Folder name="nextjs-frontend">
            <FileTree.File name="package.json" />
        </FileTree.Folder>
    </FileTree.Folder>
</FileTree>

Bootstrap your Mastra server:

```bash copy
npx create-mastra@latest
```

This command will launch an interactive wizard to help you scaffold a new Mastra project, including prompting you for a project name and setting up basic configurations.
Follow the prompts to create your server project.

You now have a basic Mastra server project ready. You should have the following files and folders:

<FileTree>
    <FileTree.Folder name="src" defaultOpen>
      <FileTree.Folder name="mastra" defaultOpen>
        <FileTree.File name="index.ts" />
        <FileTree.Folder name="agents" defaultOpen>
          <FileTree.File name="weather-agent.ts" />
        </FileTree.Folder>
        <FileTree.Folder name="tools" defaultOpen>
          <FileTree.File name="weather-tool.ts" />
        </FileTree.Folder>
        <FileTree.Folder name="workflows" defaultOpen>
          <FileTree.File name="weather-workflow.ts" />
        </FileTree.Folder>
      </FileTree.Folder>
    </FileTree.Folder>
</FileTree>

<Callout>
Ensure that you have set the appropriate environment variables for your LLM provider in the `.env` file.
</Callout>

### Compatibility Fix

Currently, to ensure proper compatibility between Mastra and Assistant UI, you need to setup server middleware. Update your `/mastra/index.ts` file with the following configuration:

```typescript showLineNumbers copy filename="src/mastra/index.ts"
export const mastra = new Mastra({
  //mastra server middleware
  server:{
  middleware: [{
    path: '/api/agents/*/stream',
    handler: async (c,next)=>{
    
      const body = await c.req.json();
  
      if ('state' in body && body.state == null) {
        delete body.state;
        delete body.tools;
      }
  
       c.req.json = async() => body;
  
      return next()
    }
  }]
 },
});
```

This middleware ensures that when Assistant UI sends a request with `state: null` and `tools: {}` in the request body, we remove those properties to make the request work properly with Mastra.

<Callout type="info">
The `state: null` property can cause errors like `Cannot use 'in' operator to search for 'input' in null` in Mastra. Additionally, passing `tools: {}` overrides Mastra's built-in tools. Mastra only supports `clientTools` via the Mastra client SDK from the client side. For more information about client tools, see the [Client Tools documentation](/reference/client-js/agents#client-tools).
</Callout>

### Run the Mastra Server

Run the Mastra server using the following command:

```bash copy
npm run dev
```

By default, the Mastra server will run on `http://localhost:5000`. Your `weatherAgent` should now be accessible via a POST request endpoint, typically `http://localhost:5000/api/agents/weatherAgent/stream`. Keep this server running for the next steps where we'll set up the Assistant UI frontend to connect to it.

### Initialize Assistant UI

Create a new `assistant-ui` project with the following command.

```bash copy
npx assistant-ui@latest create
```

<Callout>For detailed setup instructions, including adding API keys, basic configuration, and manual setup steps, please refer to [assistant-ui's official documentation](https://assistant-ui.com/docs).</Callout>

### Configure Frontend API Endpoint

The default Assistant UI setup configures the chat runtime to use a local API route (`/api/chat`) within the Next.js project. Since our Mastra agent is running on a separate server, we need to update the frontend to point to that server's endpoint.

Find the `useChatRuntime` hook in the `assistant-ui` project, typically at `app/assistant.tsx` and change the `api` property to the full URL of your Mastra agent's stream endpoint:

```typescript showLineNumbers copy filename="app/assistant.tsx" {2}
const runtime = useChatRuntime({
    api: "http://localhost:5000/api/agents/weatherAgent/stream",
});
```

Now, the Assistant UI frontend will send chat requests directly to your running Mastra server.

### Run the Application

You're ready to connect the pieces! Make sure both the Mastra server and the Assistant UI frontend are running. Start the Next.js development server:

```bash copy
npm run dev
```

You should now be able to chat with your agent in the browser.

</Steps>

Congratulations! You have successfully integrated Mastra with Assistant UI using a separate server approach. Your Assistant UI frontend now communicates with a standalone Mastra agent server.


---
title: "Using with CopilotKit"
description: "Learn how Mastra leverages the CopilotKit's AGUI library and how you can leverage it to build user experiences"
---

import { Tabs } from "nextra/components";
import Image from "next/image";

# AI SDK v5 (beta) Migration Guide
[EN] Source: https://mastra.ai/en/docs/frameworks/ai-sdk-v5

This guide covers Mastra-specific considerations when migrating from AI SDK v4 to v5 beta.

Please add any feedback or bug reports to the [AI SDK v5 mega issue in Github.](https://github.com/mastra-ai/mastra/issues/5470)

## Official Migration Guide

**Follow the official [AI SDK v5 Migration Guide](https://v5.ai-sdk.dev/docs/migration-guides/migration-guide-5-0)** for all AI SDK core breaking changes, package updates, and API changes.

This guide covers only the Mastra-specific aspects of the migration.

## Warnings

- **Data compatibility**: New data stored in v5 format will no longer work if you downgrade from the beta
- **Backup recommendation**: Keep DB backups from before you upgrade to v5 beta
- **Production use**: Wait for the AI SDK v5 stable release before using in production applications
- **Prerelease status**: The Mastra `ai-v5` tag is a prerelease version and may have bugs

## Memory Storage

Your existing AI SDK v4 data will run through our internal `MessageList` class which handles converting to/from various message formats.
This includes converting from AI SDK v4->v5. This means you don't need to run any DB migrations and your data will be translated on the fly and will just work when you upgrade.


## Migration Strategy

Migrating to AI SDK v5 with Mastra involves updating both your **backend** (Mastra server) and **frontend**.
We provide a compatibility mode to handle stream format conversion during the transition.

### Backend Upgrade

Bump Mastra to the new `ai-v5` prerelease version for all Mastra packages:

```bash npm2yarn copy
npm i mastra@ai-v5 @mastra/core@ai-v5 @mastra/memory@ai-v5 [etc]
```

Then configure your Mastra instance with v4 compatibility so your existing frontend will continue to work:

```typescript
import { Mastra } from '@mastra/core';

export const mastra = new Mastra({
  agents: { myAgent },
  aiSdkCompat: 'v4', // <- add this for compatibility
});
```

#### Dependencies

You will need to upgrade all AI SDK dependencies to use the new v5 beta versions in your backend when you bump to the Mastra `ai-v5` prerelease tag.

In most cases this will only involve bumping your model provider packages. For example: `npm i @ai-sdk/openai@2.0.0-beta.1` - refer to the [AI SDK v5 documentation](https://v5.ai-sdk.dev/docs/migration-guides/migration-guide-5-0) for more info. Some model providers do not yet have V5 versions (Openrouter for example).

Also note that you need to bump all your Mastra dependencies to the new `ai-v5` tag, and you must upgrade `zod` to the latest version if you have it installed.

#### Using Stream Compatibility Manually

If you have a frontend that calls Mastra agents in an endpoint, you can wrap the new `response.toUIMessageStreamResponse()` manually.

```ts
import { mastra } from "@/src/mastra";
import { createV4CompatibleResponse } from "@mastra/core/agent";

const myAgent = mastra.getAgent("weatherAgent");
export async function POST(req: Request) {
  const { messages } = await req.json();
  const stream = await myAgent.stream(messages);

  return createV4CompatibleResponse(stream.toUIMessageStreamResponse().body!);
}
```

### Using Mastra Playground

Currently playground is still an AI SDK v4 frontend. For now you need to set `aiSdkCompat: 'v4'` for it to work.
We'll handle this automatically for you soon.

### Frontend Upgrade

When you're ready, remove the compatibility flag and upgrade your frontend:

1. Remove `aiSdkCompat: 'v4'` from your Mastra configuration
2. Follow the AI SDK guide on upgrading your frontend dependencies
3. Update your frontend code for v5 breaking changes

## Discussion and Bug Reports

Please add any feedback or bug reports to the [AI SDK v5 mega issue in Github.](https://github.com/mastra-ai/mastra/issues/5470)



---
title: "Getting started with Mastra and Express | Mastra Guides"
description: A step-by-step guide to integrating Mastra with an Express backend.
---

import { Callout, Steps, Tabs, FileTree } from "nextra/components";

# Model Providers
[EN] Source: https://mastra.ai/en/docs/getting-started/model-providers

Model providers are used to interact with different language models. Mastra uses [Vercel's AI SDK](https://sdk.vercel.ai) as a model routing layer to provide a similar syntax for many models:

```typescript showLineNumbers copy {1,7} filename="src/mastra/agents/weather-agent.ts"
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

const agent = new Agent({
  name: "WeatherAgent",
  instructions: "Instructions for the agent...",
  model: openai("gpt-4-turbo"),
});

const result = await agent.generate("What is the weather like?");
```

## Types of AI SDK model providers

Model providers from the AI SDK can be grouped into three main categories:

- [Official providers maintained by the AI SDK team](/docs/getting-started/model-providers#official-providers)
- [OpenAI-compatible providers](/docs/getting-started/model-providers#openai-compatible-providers)
- [Community providers](/docs/getting-started/model-providers#community-providers)

> You can find a list of all available model providers in the [AI SDK documentation](https://ai-sdk.dev/providers/ai-sdk-providers).

<Callout>
AI SDK model providers are packages that need to be installed in your Mastra project.
The default model provider selected during the installation process is installed in the project.

If you want to use a different model provider, you need to install it in your project as well.
</Callout>

Here are some examples of how Mastra agents can be configured to use the different types of model providers:

### Official providers

Official model providers are maintained by the AI SDK team.
Their packages are usually prefixed with `@ai-sdk/`, e.g. `@ai-sdk/anthropic`, `@ai-sdk/openai`, etc.

```typescript showLineNumbers copy {1,7} filename="src/mastra/agents/weather-agent.ts"
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

const agent = new Agent({
  name: "WeatherAgent",
  instructions: "Instructions for the agent...",
  model: openai("gpt-4-turbo"),
});
```

Additional configuration may be done by importing a helper function from the AI SDK provider.
Here's an example using the OpenAI provider:

```typescript showLineNumbers copy filename="src/mastra/agents/weather-agent.ts" {1,4-8,13}
import { createOpenAI } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent"

const openai = createOpenAI({
    baseUrl: "<your-custom-base-url>",
    apiKey: "<your-custom-api-key>",
    ...otherOptions
});

const agent = new Agent({
    name: "WeatherAgent",
    instructions: "Instructions for the agent...",
    model: openai("<model-name>"),
});
```

### OpenAI-compatible providers

Some language model providers implement the OpenAI API. For these providers, you can use the [`@ai-sdk/openai-compatible`](https://www.npmjs.com/package/@ai-sdk/openai-compatible) provider.

Here's the general setup and provider instance creation:

```typescript showLineNumbers copy filename="src/mastra/agents/weather-agent.ts" {1,4-14,19}
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { Agent } from "@mastra/core/agent";

const openaiCompatible = createOpenAICompatible({
    name: "<model-name>",
    baseUrl: "<base-url>",
    apiKey: "<api-key>",
    headers: {},
    queryParams: {},
    fetch: async (url, options) => {
        // custom fetch logic
        return fetch(url, options);
    }
});

const agent = new Agent({
    name: "WeatherAgent",
    instructions: "Instructions for the agent...",
    model: openaiCompatible("<model-name>"),
});
```

For more information on the OpenAI-compatible provider, please refer to the [AI SDK documentation](https://ai-sdk.dev/providers/openai-compatible-providers).

### Community providers

The AI SDK provides a [Language Model Specification](https://github.com/vercel/ai/tree/main/packages/provider/src/language-model/v1).
Following this specification, you can create your own model provider compatible with the AI SDK.

Some community providers have implemented this specification and are compatible with the AI SDK.
We will look at one such provider, the Ollama provider available in the [`ollama-ai-provider`](https://github.com/sgomez/ollama-ai-provider) package.

Here's an example:

```typescript showLineNumbers copy filename="src/mastra/agents/weather-agent.ts" {1,7}
import { ollama } from "ollama-ai-provider";
import { Agent } from "@mastra/core/agent";

const agent = new Agent({
    name: "WeatherAgent",
    instructions: "Instructions for the agent...",
    model: ollama("llama3.2:latest"),
});
```

You can also configure the Ollama provider like so:

```typescript showLineNumbers copy filename="src/mastra/agents/weather-agent.ts" {1,4-7,12}
import { createOllama } from "ollama-ai-provider";
import { Agent } from "@mastra/core/agent";

const ollama = createOllama({
    baseUrl: "<your-custom-base-url>",
    ...otherOptions,
});

const agent = new Agent({
    name: "WeatherAgent",
    instructions: "Instructions for the agent...",
    model: ollama("llama3.2:latest"),
});
```

For more information on the Ollama provider and other available community providers, please refer to the [AI SDK documentation](https://ai-sdk.dev/providers/community-providers).

<Callout>
While this example shows how to use the Ollama provider, other providers like `openrouter`, `azure`, etc. may also be used.
</Callout>

Different AI providers may have different options for configuration. Please refer to the [AI SDK documentation](https://ai-sdk.dev/providers/ai-sdk-providers) for more information.


---
title: "Local Project Structure | Getting Started | Mastra Docs"
description: Guide on organizing folders and files in Mastra, including best practices and recommended structures.
---

import { FileTree } from "nextra/components";

# Project Structure
[EN] Source: https://mastra.ai/en/docs/getting-started/project-structure

This page provides a guide for organizing folders and files in Mastra. Mastra is a modular framework, and you can use any of the modules separately or together.

You could write everything in a single file, or separate each agent, tool, and workflow into their own files.

We don't enforce a specific folder structure, but we do recommend some best practices, and the CLI will scaffold a project with a sensible structure.

## Example Project Structure

A default project created with the CLI looks like this:

<FileTree>
  <FileTree.Folder name="src" defaultOpen>
    <FileTree.Folder name="mastra" defaultOpen>
      <FileTree.Folder name="agents" defaultOpen>
        <FileTree.File name="agent-name.ts" />
      </FileTree.Folder>
      <FileTree.Folder name="tools" defaultOpen>
        <FileTree.File name="tool-name.ts" />
      </FileTree.Folder>
      <FileTree.Folder name="workflows" defaultOpen>
        <FileTree.File name="workflow-name.ts" />
      </FileTree.Folder>
      <FileTree.File name="index.ts" />
    </FileTree.Folder>
  </FileTree.Folder>
  <FileTree.File name=".env" />
  <FileTree.File name="package.json" />
  <FileTree.File name="tsconfig.json" />
</FileTree>
{/*
```
root/
├── src/
│   └── mastra/
│       ├── agents/
│       │   └── index.ts
│       ├── tools/
│       │   └── index.ts
│       ├── workflows/
│       │   └── index.ts
│       ├── index.ts
├── .env
├── package.json
├── tssconfig.json
``` */}

### Top-level Folders

| Folder                 | Description                          |
| ---------------------- | ------------------------------------ |
| `src/mastra`           | Core application folder              |
| `src/mastra/agents`    | Agent configurations and definitions |
| `src/mastra/tools`     | Custom tool definitions              |
| `src/mastra/workflows` | Workflow definitions                 |

### Top-level Files

| File                  | Description                                         |
| --------------------- | --------------------------------------------------- |
| `src/mastra/index.ts` | Main configuration file for Mastra                  |
| `.env`                | Environment variables                               |
| `package.json`        | Node.js project metadata, scripts, and dependencies |
| `tsconfig.json`       | TypeScript compiler configuration                   |


---
title: "Introduction | Mastra Docs"
description: "Mastra is a TypeScript agent framework. It helps you build AI applications and features quickly. It gives you the set of primitives you need: workflows, agents, RAG, integrations, syncs and evals."
---

# About Mastra
[EN] Source: https://mastra.ai/en/docs

Mastra is an open-source TypeScript agent framework.

It's designed to give you the primitives you need to build AI applications and features.

You can use Mastra to build [AI agents](/docs/agents/overview.mdx) that have memory and can execute functions, or chain LLM calls in deterministic [workflows](/docs/workflows/overview.mdx). You can chat with your agents in Mastra's [local dev environment](/docs/local-dev/mastra-dev.mdx), feed them application-specific knowledge with [RAG](/docs/rag/overview.mdx), and score their outputs with Mastra's [evals](/docs/evals/overview.mdx).

The main features include:

- **[Model routing](https://sdk.vercel.ai/docs/introduction)**: Mastra uses the [Vercel AI SDK](https://sdk.vercel.ai/docs/introduction) for model routing, providing a unified interface to interact with any LLM provider including OpenAI, Anthropic, and Google Gemini.
- **[Agent memory and tool calling](/docs/agents/agent-memory.mdx)**: With Mastra, you can give your agent tools (functions) that it can call. You can persist agent memory and retrieve it based on recency, semantic similarity, or conversation thread.
- **[Workflow graphs](/docs/workflows/overview.mdx)**: When you want to execute LLM calls in a deterministic way, Mastra gives you a graph-based workflow engine. You can define discrete steps, log inputs and outputs at each step of each run, and pipe them into an observability tool. Mastra workflows have a simple syntax for control flow (`.then()`, `.branch()`, `.parallel()`) that allows branching and chaining.
- **[Agent development environment](/docs/local-dev/mastra-dev.mdx)**: When you're developing an agent locally, you can chat with it and see its state and memory in Mastra's agent development environment.
- **[Retrieval-augmented generation (RAG)](/docs/rag/overview.mdx)**: Mastra gives you APIs to process documents (text, HTML, Markdown, JSON) into chunks, create embeddings, and store them in a vector database. At query time, it retrieves relevant chunks to ground LLM responses in your data, with a unified API on top of multiple vector stores (Pinecone, pgvector, etc) and embedding providers (OpenAI, Cohere, etc).
- **[Deployment](/docs/deployment/deployment.mdx)**: Mastra supports bundling your agents and workflows within an existing React, Next.js, or Node.js application, or into standalone endpoints. The Mastra deploy helper lets you easily bundle agents and workflows into a Node.js server using Hono, or deploy it onto a serverless platform like Vercel, Cloudflare Workers, or Netlify.
- **[Evals](/docs/evals/overview.mdx)**: Mastra provides automated evaluation metrics that use model-graded, rule-based, and statistical methods to assess LLM outputs, with built-in metrics for toxicity, bias, relevance, and factual accuracy. You can also define your own evals.


---
title: Understanding the Mastra Cloud Dashboard
description: Details of each feature available in Mastra Cloud
---

import { MastraCloudCallout } from '@/components/mastra-cloud-callout'

# Understanding Tracing and Logs
[EN] Source: https://mastra.ai/en/docs/mastra-cloud/observability

Mastra Cloud captures execution data to help you monitor your application's behavior in the production environment.

<MastraCloudCallout />

## Logs

You can view detailed logs for debugging and monitoring your application's behavior on the [Logs](/docs/mastra-cloud/dashboard#logs) page of the Dashboard.

![Dashboard logs](/image/mastra-cloud/mastra-cloud-dashboard-logs.jpg)

Key features:

Each log entry includes its severity level and a detailed message showing agent, workflow, or storage activity.

## Traces

More detailed traces are available for both agents and workflows by using a [logger](/docs/observability/logging) or enabling [telemetry](/docs/observability/tracing) using one of our [supported providers](/reference/observability/providers).

### Agents

With a [logger](/docs/observability/logging) enabled, you can view detailed outputs from your agents in the **Traces** section of the Agents Playground.

![observability agents](/image/mastra-cloud/mastra-cloud-observability-agents.jpg)

Key features:

Tools passed to the agent during generation are standardized using `convertTools`. This includes retrieving client-side tools, memory tools, and tools exposed from workflows.


### Workflows

With a [logger](/docs/observability/logging) enabled, you can view detailed outputs from your workflows in the **Traces** section of the Workflows Playground.

![observability workflows](/image/mastra-cloud/mastra-cloud-observability-workflows.jpg)

Key features:

Workflows are created using `createWorkflow`, which sets up steps, metadata, and tools. You can run them with `runWorkflow` by passing input and options.

## Next steps

- [Logging](/docs/observability/logging)
- [Tracing](/docs/observability/tracing)


---
title: Mastra Cloud
description: Deployment and monitoring service for Mastra applications
---

import { MastraCloudCallout } from '@/components/mastra-cloud-callout'
import { FileTree } from "nextra/components";

# Logging
[EN] Source: https://mastra.ai/en/docs/observability/logging

In Mastra, logs can detail when certain functions run, what input data they receive, and how they respond.

## Basic Setup

Here's a minimal example that sets up a **console logger** at the `INFO` level. This will print out informational messages and above (i.e., `DEBUG`, `INFO`, `WARN`, `ERROR`) to the console.

```typescript filename="mastra.config.ts" showLineNumbers copy
import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";

export const mastra = new Mastra({
  // Other Mastra configuration...
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
```

In this configuration:

- `name: "Mastra"` specifies the name to group logs under.
- `level: "info"` sets the minimum severity of logs to record.

## Configuration

- For more details on the options you can pass to `PinoLogger()`, see the [PinoLogger reference documentation](/reference/observability/logger).
- Once you have a `Logger` instance, you can call its methods (e.g., `.info()`, `.warn()`, `.error()`) in the [Logger instance reference documentation](/reference/observability/logger).
- If you want to send your logs to an external service for centralized collection, analysis, or storage, you can configure other logger types such as Upstash Redis. Consult the [Logger reference documentation](/reference/observability/logger) for details on parameters like `url`, `token`, and `key` when using the `UPSTASH` logger type.


---
title: "Next.js Tracing | Mastra Observability Documentation"
description: "Set up OpenTelemetry tracing for Next.js applications"
---

# Advanced Tool Usage
[EN] Source: https://mastra.ai/en/docs/tools-mcp/advanced-usage

This page covers more advanced techniques and features related to using tools in Mastra.

## Abort Signals

When you initiate an agent interaction using `generate()` or `stream()`, you can provide an `AbortSignal`. Mastra automatically forwards this signal to any tool executions that occur during that interaction.

This allows you to cancel long-running operations within your tools, such as network requests or intensive computations, if the parent agent call is aborted.

You access the `abortSignal` in the second parameter of the tool's `execute` function.

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const longRunningTool = createTool({
  id: "long-computation",
  description: "Performs a potentially long computation",
  inputSchema: z.object({ /* ... */ }),
  execute: async ({ context }, { abortSignal }) => {
    // Example: Forwarding signal to fetch
    const response = await fetch("https://api.example.com/data", {
      signal: abortSignal, // Pass the signal here
    });

    if (abortSignal?.aborted) {
      console.log("Tool execution aborted.");
      throw new Error("Aborted");
    }

    // Example: Checking signal during a loop
    for (let i = 0; i < 1000000; i++) {
      if (abortSignal?.aborted) {
        console.log("Tool execution aborted during loop.");
        throw new Error("Aborted");
      }
      // ... perform computation step ...
    }

    const data = await response.json();
    return { result: data };
  },\n});
```

To use this, provide an `AbortController`'s signal when calling the agent:

```typescript
import { Agent } from "@mastra/core/agent";
// Assume 'agent' is an Agent instance with longRunningTool configured

const controller = new AbortController();

// Start the agent call
const promise = agent.generate("Perform the long computation.", {
  abortSignal: controller.signal,
});

// Sometime later, if needed:
// controller.abort();

try {
  const result = await promise;
  console.log(result.text);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Agent generation was aborted.");
  } else {
    console.error("An error occurred:", error);
  }
}
```

## AI SDK Tool Format

Mastra maintains compatibility with the tool format used by the Vercel AI SDK (`ai` package). You can define tools using the `tool` function from the `ai` package and use them directly within your Mastra agents alongside tools created with Mastra's `createTool`.

First, ensure you have the `ai` package installed:

```bash npm2yarn copy
npm install ai
```

Here's an example of a tool defined using the Vercel AI SDK format:

```typescript filename="src/mastra/tools/vercelWeatherTool.ts" copy
import { tool } from "ai";
import { z } from "zod";

export const vercelWeatherTool = tool({
  description: "Fetches current weather using Vercel AI SDK format",
  parameters: z.object({
    city: z.string().describe("The city to get weather for"),
  }),
  execute: async ({ city }) => {
    console.log(`Fetching weather for ${city} (Vercel format tool)`);
    // Replace with actual API call
    const data = await fetch(`https://api.example.com/weather?city=${city}`);
    return data.json();
  },
});
```

You can then add this tool to your Mastra agent just like any other tool:

```typescript filename="src/mastra/agents/mixedToolsAgent.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { vercelWeatherTool } from "../tools/vercelWeatherTool"; // Vercel AI SDK tool
import { mastraTool } from "../tools/mastraTool"; // Mastra createTool tool

export const mixedToolsAgent = new Agent({
  name: "Mixed Tools Agent",
  instructions: "You can use tools defined in different formats.",
  model: openai("gpt-4o-mini"),
  tools: {
    weatherVercel: vercelWeatherTool,
    someMastraTool: mastraTool,
  },
});
```

Mastra supports both tool formats, allowing you to mix and match as needed.


---
title: "Dynamic Tool Context | Tools & MCP | Mastra Docs"
description: Learn how to use Mastra's RuntimeContext to provide dynamic, request-specific configuration to tools.
---

import { Callout } from "nextra/components";

# Dynamic Tool Context
[EN] Source: https://mastra.ai/en/docs/tools-mcp/dynamic-context

Mastra provides `RuntimeContext`, a system based on dependency injection, that allows you to pass dynamic, request-specific configuration to your tools during execution. This is useful when a tool's behavior needs to change based on user identity, request headers, or other runtime factors, without altering the tool's core code.

<Callout>
  **Note:** `RuntimeContext` is primarily used for passing data *into* tool
  executions. It's distinct from agent memory, which handles conversation
  history and state persistence across multiple calls.
</Callout>

## Basic Usage

To use `RuntimeContext`, first define a type structure for your dynamic configuration. Then, create an instance of `RuntimeContext` typed with your definition and set the desired values. Finally, include the `runtimeContext` instance in the options object when calling `agent.generate()` or `agent.stream()`.

```typescript
import { RuntimeContext } from "@mastra/core/di";
// Assume 'agent' is an already defined Mastra Agent instance

// Define the context type
type WeatherRuntimeContext = {
  "temperature-scale": "celsius" | "fahrenheit";
};

// Instantiate RuntimeContext and set values
const runtimeContext = new RuntimeContext<WeatherRuntimeContext>();
runtimeContext.set("temperature-scale", "celsius");

// Pass to agent call
const response = await agent.generate("What's the weather like today?", {
  runtimeContext, // Pass the context here
});

console.log(response.text);
```

## Accessing Context in Tools

Tools receive the `runtimeContext` as part of the second argument to their `execute` function. You can then use the `.get()` method to retrieve values.

```typescript filename="src/mastra/tools/weather-tool.ts"
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
// Assume WeatherRuntimeContext is defined as above and accessible here

// Dummy fetch function
async function fetchWeather(
  location: string,
  options: { temperatureUnit: "celsius" | "fahrenheit" },
): Promise<any> {
  console.log(`Fetching weather for ${location} in ${options.temperatureUnit}`);
  // Replace with actual API call
  return { temperature: options.temperatureUnit === "celsius" ? 20 : 68 };
}

export const weatherTool = createTool({
  id: "getWeather",
  description: "Get the current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("The location to get weather for"),
  }),
  // The tool's execute function receives runtimeContext
  execute: async ({ context, runtimeContext }) => {
    // Type-safe access to runtimeContext variables
    const temperatureUnit = runtimeContext.get("temperature-scale");

    // Use the context value in the tool logic
    const weather = await fetchWeather(context.location, {
      temperatureUnit,
    });

    return {
      result: `The temperature is ${weather.temperature}°${temperatureUnit === "celsius" ? "C" : "F"}`,
    };
  },
});
```

When the agent uses `weatherTool`, the `temperature-scale` value set in the `runtimeContext` during the `agent.generate()` call will be available inside the tool's `execute` function.

## Using with Server Middleware

In server environments (like Express or Next.js), you can use middleware to automatically populate `RuntimeContext` based on incoming request data, such as headers or user sessions.

Here's an example using Mastra's built-in server middleware support (which uses Hono internally) to set the temperature scale based on the Cloudflare `CF-IPCountry` header:

```typescript filename="src/mastra/index.ts"
import { Mastra } from "@mastra/core";
import { RuntimeContext } from "@mastra/core/di";
import { weatherAgent } from "./agents/weather"; // Assume agent is defined elsewhere

// Define RuntimeContext type
type WeatherRuntimeContext = {
  "temperature-scale": "celsius" | "fahrenheit";
};

export const mastra = new Mastra({
  agents: {
    weather: weatherAgent,
  },
  server: {
    middleware: [
      async (c, next) => {
        // Get the RuntimeContext instance
        const runtimeContext =
          c.get<RuntimeContext<WeatherRuntimeContext>>("runtimeContext");

        // Get country code from request header
        const country = c.req.header("CF-IPCountry");

        // Set temperature scale based on country
        runtimeContext.set(
          "temperature-scale",
          country === "US" ? "fahrenheit" : "celsius",
        );

        // Continue request processing
        await next();
      },
    ],
  },
});
```

With this middleware in place, any agent call handled by this Mastra server instance will automatically have the `temperature-scale` set in its `RuntimeContext` based on the user's inferred country, and tools like `weatherTool` will use it accordingly.


---
title: "MCP Overview | Tools & MCP | Mastra Docs"
description: Learn about the Model Context Protocol (MCP), how to use third-party tools via MCPClient, connect to registries, and share your own tools using MCPServer.
---

import { Tabs } from "nextra/components";

# Tools Overview
[EN] Source: https://mastra.ai/en/docs/tools-mcp/overview

Tools are functions that agents can execute to perform specific tasks or access external information. They extend an agent's capabilities beyond simple text generation, allowing interaction with APIs, databases, or other systems.

Each tool typically defines:

- **Inputs:** What information the tool needs to run (defined with an `inputSchema`, often using Zod).
- **Outputs:** The structure of the data the tool returns (defined with an `outputSchema`).
- **Execution Logic:** The code that performs the tool's action.
- **Description:** Text that helps the agent understand what the tool does and when to use it.

## Creating Tools

In Mastra, you create tools using the [`createTool`](/reference/tools/create-tool) function from the `@mastra/core/tools` package.

```typescript filename="src/mastra/tools/weatherInfo.ts" copy
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const getWeatherInfo = async (city: string) => {
  // Replace with an actual API call to a weather service
  console.log(`Fetching weather for ${city}...`);
  // Example data structure
  return { temperature: 20, conditions: "Sunny" };
};

export const weatherTool = createTool({
  id: "Get Weather Information",
  description: `Fetches the current weather information for a given city`,
  inputSchema: z.object({
    city: z.string().describe("City name"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    conditions: z.string(),
  }),
  execute: async ({ context: { city } }) => {
    console.log("Using tool to fetch weather information for", city);
    return await getWeatherInfo(city);
  },
});
```

This example defines a `weatherTool` with an input schema for the city, an output schema for the weather data, and an `execute` function that contains the tool's logic.

When creating tools, keep tool descriptions simple and focused on **what** the tool does and **when** to use it, emphasizing its primary use case. Technical details belong in the parameter schemas, guiding the agent on _how_ to use the tool correctly with descriptive names, clear descriptions, and explanations of default values.

## Adding Tools to an Agent

To make tools available to an agent, you configure them in the agent's definition. Mentioning available tools and their general purpose in the agent's system prompt can also improve tool usage. For detailed steps and examples, see the guide on [Using Tools and MCP with Agents](/docs/agents/using-tools-and-mcp#add-tools-to-an-agent).

## Compatibility Layer for Tool Schemas

Different models interpret schemas differely. Some error when certain schema properties are passed and some ignore certain schema properties but don't throw an error. Mastra adds a compatibility layer for tool schemas, ensuring tools work consistently across different model providers and that the schema constraints are respected.

Some providers that we include this layer for:

- **Google Gemini & Anthropic:** Remove unsupported schema properties and append relevant constraints to the tool description.
- **OpenAI (including reasoning models):** Strip or adapt schema fields that are ignored or unsupported, and add instructions to the description for agent guidance.
- **DeepSeek & Meta:** Apply similar compatibility logic to ensure schema alignment and tool usability.

This approach makes tool usage more reliable and model-agnostic for both custom and MCP tools.


---
title: "Branching, Merging, Conditions | Workflows | Mastra Docs"
description: "Control flow in Mastra workflows allows you to manage branching, merging, and conditions to construct workflows that meet your logic requirements."
---

# Control Flow
[EN] Source: https://mastra.ai/en/docs/workflows/control-flow

When you build a workflow, you typically break down operations into smaller tasks that can be linked and reused. **Steps** provide a structured way to manage these tasks by defining inputs, outputs, and execution logic.

- If the schemas match, the `outputSchema` from each step is automatically passed to the `inputSchema` of the next step.
- If the schemas don't match, use [Input data mapping](./input-data-mapping.mdx) to transform the `outputSchema` into the expected `inputSchema`.

## Chaining steps with `.then()`

Chain steps to execute sequentially using `.then()`:

![Chaining steps with .then()](/image/workflows/workflows-control-flow-then.jpg)

```typescript {8-9,4-5} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const step2 = createStep({...});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .then(step2)
  .commit();
```

This does what you'd expect: it executes `step1`, then it executes `step2`.

## Simultaneous steps with `.parallel()`

Execute steps simultaneously using `.parallel()`:

![Concurrent steps with .parallel()](/image/workflows/workflows-control-flow-parallel.jpg)

```typescript {8,4-5} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const step2 = createStep({...});
const step3 = createStep({...});

export const testWorkflow = createWorkflow({...})
  .parallel([step1, step2])
  .then(step3)
  .commit();
```

This executes `step1` and `step2` concurrently, then continues to `step3` after both complete.

> See [Parallel Execution with Steps](/examples/workflows/parallel-steps) for more information.

## Conditional logic with `.branch()`

Execute steps conditionally using `.branch()`:

![Conditional branching with .branch()](/image/workflows/workflows-control-flow-branch.jpg)

```typescript {8-11,4-5} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const lessThanStep = createStep({...});
const greaterThanStep = createStep({...});

export const testWorkflow = createWorkflow({...})
  .branch([
    [async ({ inputData: { value } }) => (value < 9), lessThanStep],
    [async ({ inputData: { value } }) => (value >= 9), greaterThanStep]
  ])
  .commit();
```

Branch conditions are evaluated sequentially, but steps with matching conditions are executed in parallel.

> See [Workflow with Conditional Branching](/examples/workflows/conditional-branching) for more information.

## Looping steps

Workflows support two types of loops. When looping a step, or any step-compatible construct like a nested workflow, the initial `inputData` is sourced from the output of the previous step.

To ensure compatibility, the loop’s initial input must either match the shape of the previous step’s output, or be explicitly transformed using the `map` function.

- Match the shape of the previous step’s output, or
- Be explicitly transformed using the `map` function.

### Repeating with `.dowhile()`

Executes step repeatedly while a condition is true.

![Repeating with .dowhile()](/image/workflows/workflows-control-flow-dowhile.jpg)

```typescript {7} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const counterStep = createStep({...});

export const testWorkflow = createWorkflow({...})
  .dowhile(counterStep, async ({ inputData: { number } }) => number < 10)
  .commit();
```

### Repeating with `.dountil()`

Executes step repeatedly until a condition becomes true.

![Repeating with .dountil()](/image/workflows/workflows-control-flow-dountil.jpg)

```typescript {7} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const counterStep = createStep({...});

export const testWorkflow = createWorkflow({...})
  .dountil(counterStep, async ({ inputData: { number } }) => number > 10)
  .commit();
```

### Repeating with `.foreach()`

Sequentially executes the same step for each item from the `inputSchema`.

![Repeating with .foreach()](/image/workflows/workflows-control-flow-foreach.jpg)

```typescript {7} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const mapStep = createStep({...});

export const testWorkflow = createWorkflow({...})
  .foreach(mapStep)
  .commit();
```

#### Setting concurrency limits

Use `concurrency` to execute steps in parallel with a limit on the number of concurrent executions.

```typescript {7} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const mapStep = createStep({...})

export const testWorkflow = createWorkflow({...})
  .foreach(mapStep, { concurrency: 2 })
  .commit();
```

## Using a nested workflow

Use a nested workflow as a step by passing it to `.then()`. This runs each of its steps in sequence as part of the parent workflow.

```typescript {4,7} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

export const nestedWorkflow = createWorkflow({...})

export const testWorkflow = createWorkflow({...})
  .then(nestedWorkflow)
  .commit();
```

## Cloning a workflow

Use `cloneWorkflow` to duplicate an existing workflow. This lets you reuse its structure while overriding parameters like `id`.

```typescript {6,10} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep, cloneWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const parentWorkflow = createWorkflow({...})
const clonedWorkflow = cloneWorkflow(parentWorkflow, { id: "cloned-workflow" });

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .then(clonedWorkflow)
  .commit();
```

## Exiting early with `bail()`

Use `bail()` in a step to exit early with a successful result. This returns the provided payload as the step output and ends workflow execution.

```typescript {7} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({
  id: 'step1',
  execute: async ({ bail }) => {
    return bail({ result: 'bailed' });
  },
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({ result: z.string() }),
});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .commit();
```

## Exiting early with `Error()`

Use `throw new Error()` in a step to exit with an error.

```typescript {7} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({
  id: 'step1',
  execute: async () => {
    throw new Error('bailed');
  },
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({ result: z.string() }),
});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .commit();
```

This throws an error from the step and stops workflow execution, returning the error as the result.

## Example Run Instance

The following example demonstrates how to start a run with multiple inputs. Each input will pass through the `mapStep` sequentially.

```typescript {6} filename="src/test-workflow.ts" showLineNumbers copy
import { mastra } from "./mastra";

const run = await mastra.getWorkflow("testWorkflow").createRunAsync();

const result = await run.start({
  inputData: [{ number: 10 }, { number: 100 }, { number: 200 }]
});
```

To execute this run from your terminal:

```bash copy
npx tsx src/test-workflow.ts
```


---
title: "Inngest Workflows | Workflows | Mastra Docs"
description: "Inngest workflow allows you to run Mastra workflows with Inngest"
---

# Inngest Workflow
[EN] Source: https://mastra.ai/en/docs/workflows/inngest-workflow

[Inngest](https://www.inngest.com/docs) is a developer platform for building and running background workflows, without managing infrastructure.

## How Inngest Works with Mastra

Inngest and Mastra integrate by aligning their workflow models: Inngest organizes logic into functions composed of steps, and Mastra workflows defined using `createWorkflow` and `createStep` map directly onto this paradigm. Each Mastra workflow becomes an Inngest function with a unique identifier, and each step within the workflow maps to an Inngest step.

The `serve` function bridges the two systems by registering Mastra workflows as Inngest functions and setting up the necessary event handlers for execution and monitoring.

When an event triggers a workflow, Inngest executes it step by step, memoizing each step’s result. This means if a workflow is retried or resumed, completed steps are skipped, ensuring efficient and reliable execution. Control flow primitives in Mastra, such as loops, conditionals, and nested workflows are seamlessly translated into the same Inngest’s function/step model, preserving advanced workflow features like composition, branching, and suspension.

Real-time monitoring, suspend/resume, and step-level observability are enabled via Inngest’s publish-subscribe system and dashboard. As each step executes, its state and output are tracked using Mastra storage and can be resumed as needed.

## Setup

```sh
npm install @mastra/inngest @mastra/core @mastra/deployer
```

## Building an Inngest Workflow

This guide walks through creating a workflow with Inngest and Mastra, demonstrating a counter application that increments a value until it reaches 10.

### Inngest Initialization

Initialize the Inngest integration to obtain Mastra-compatible workflow helpers. The createWorkflow and createStep functions are used to create workflow and step objects that are compatible with Mastra and inngest.

In development

```ts showLineNumbers copy filename="src/mastra/inngest/index.ts"
import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime";

export const inngest = new Inngest({
  id: "mastra",
  baseUrl:"http://localhost:3000",
  isDev: true,
  middleware: [realtimeMiddleware()],
});
```

In production

```ts showLineNumbers copy filename="src/mastra/inngest/index.ts"
import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime";

export const inngest = new Inngest({
  id: "mastra",
  middleware: [realtimeMiddleware()],
});
```

### Creating Steps

Define the individual steps that will compose your workflow:

```ts showLineNumbers copy filename="src/mastra/workflows/index.ts"
import { z } from "zod";
import { inngest } from "../inngest";
import { init } from "@mastra/inngest";

// Initialize Inngest with Mastra, pointing to your local Inngest server
const { createWorkflow, createStep } = init(inngest);

// Step: Increment the counter value
const incrementStep = createStep({
  id: "increment",
  inputSchema: z.object({
    value: z.number(),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
  execute: async ({ inputData }) => {
    return { value: inputData.value + 1 };
  },
});
```

### Creating the Workflow

Compose the steps into a workflow using the `dountil` loop pattern. The createWorkflow function creates a function on inngest server that is invocable.

```ts showLineNumbers copy filename="src/mastra/workflows/index.ts"
// workflow that is registered as a function on inngest server
const workflow = createWorkflow({
  id: "increment-workflow",
  inputSchema: z.object({
    value: z.number(),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
}).then(incrementStep);

workflow.commit();

export { workflow as incrementWorkflow };
```

### Configuring the Mastra Instance and Executing the Workflow

Register the workflow with Mastra and configure the Inngest API endpoint:

```ts showLineNumbers copy filename="src/mastra/index.ts"
import { Mastra } from "@mastra/core/mastra";
import { serve as inngestServe } from "@mastra/inngest";
import { incrementWorkflow } from "./workflows";
import { inngest } from "./inngest";
import { PinoLogger } from "@mastra/loggers";

// Configure Mastra with the workflow and Inngest API endpoint
export const mastra = new Mastra({
  workflows: {
    incrementWorkflow,
  },
  server: {
    // The server configuration is required to allow local docker container can connect to the mastra server
    host: "0.0.0.0",
    apiRoutes: [
      // This API route is used to register the Mastra workflow (inngest function) on the inngest server
      {
        path: "/api/inngest",
        method: "ALL",
        createHandler: async ({ mastra }) => inngestServe({ mastra, inngest }),
        // The inngestServe function integrates Mastra workflows with Inngest by:
        // 1. Creating Inngest functions for each workflow with unique IDs (workflow.${workflowId})
        // 2. Setting up event handlers that:
        //    - Generate unique run IDs for each workflow execution
        //    - Create an InngestExecutionEngine to manage step execution
        //    - Handle workflow state persistence and real-time updates
        // 3. Establishing a publish-subscribe system for real-time monitoring
        //    through the workflow:${workflowId}:${runId} channel
      },
    ],
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
```

### Running the Workflow locally

> **Prerequisites:**
>
> - Docker installed and running
> - Mastra project set up
> - Dependencies installed (`npm install`)

1. Run `npx mastra dev` to start the Mastra server on local to serve the server on port 5000.
2. Start the Inngest Dev Server (via Docker)
   In a new terminal, run:

```sh
docker run --rm -p 3000:3000 \
  inngest/inngest \
  inngest dev -u http://host.docker.internal:5000/api/inngest
```

> **Note:** The URL after `-u` tells the Inngest dev server where to find your Mastra `/api/inngest` endpoint.

3. Open the Inngest Dashboard

- Visit [http://localhost:3000](http://localhost:3000) in your browser.
- Go to the **Apps** section in the sidebar.
- You should see your Mastra workflow registered.
  ![Inngest Dashboard](/inngest-apps-dashboard.png)

4. Invoke the Workflow

- Go to the **Functions** section in the sidebar.
- Select your Mastra workflow.
- Click **Invoke** and use the following input:

```json
{
  "data": {
    "inputData": {
      "value": 5
    }
  }
}
```

![Inngest Function](/inngest-function-dashboard.png)

5. **Monitor the Workflow Execution**

- Go to the **Runs** tab in the sidebar.
- Click on the latest run to see step-by-step execution progress.
  ![Inngest Function Run](/inngest-runs-dashboard.png)

### Running the Workflow in Production

> **Prerequisites:**
>
> - Vercel account and Vercel CLI installed (`npm i -g vercel`)
> - Inngest account
> - Vercel token (recommended: set as environment variable)

1. Add Vercel Deployer to Mastra instance

```ts showLineNumbers copy filename="src/mastra/index.ts"
import { VercelDeployer } from "@mastra/deployer-vercel";

export const mastra = new Mastra({
  // ...other config
  deployer: new VercelDeployer({
    teamSlug: "your_team_slug",
    projectName: "your_project_name",
    // you can get your vercel token from the vercel dashboard by clicking on the user icon in the top right corner
    // and then clicking on "Account Settings" and then clicking on "Tokens" on the left sidebar.
    token: "your_vercel_token",
  }),
});
```

> **Note:** Set your Vercel token in your environment:
>
> ```sh
> export VERCEL_TOKEN=your_vercel_token
> ```

2. Build the mastra instance

```sh
npx mastra build
```

3. Deploy to Vercel

```sh
cd .mastra/output
vercel --prod
```

> **Tip:** If you haven't already, log in to Vercel CLI with `vercel login`.

4. Sync with Inngest Dashboard

- Go to the [Inngest dashboard](https://app.inngest.com/env/production/apps).
- Click **Sync new app with Vercel** and follow the instructions.
- You should see your Mastra workflow registered as an app.
  ![Inngest Dashboard](/inngest-apps-dashboard-prod.png)

5. Invoke the Workflow

- In the **Functions** section, select `workflow.increment-workflow`.
- Click **All actions** (top right) > **Invoke**.
- Provide the following input:

```json
{
  "data": {
    "inputData": {
      "value": 5
    }
  }
}
```

![Inngest Function Run](/inngest-function-dashboard-prod.png)

6.  Monitor Execution

- Go to the **Runs** tab.
- Click the latest run to see step-by-step execution progress.
  ![Inngest Function Run](/inngest-runs-dashboard-prod.png)


---
title: "Input Data Mapping with Workflow | Mastra Docs"
description: "Learn how to use workflow input mapping to create more dynamic data flows in your Mastra workflows."
---

# Input Data Mapping
[EN] Source: https://mastra.ai/en/docs/workflows/input-data-mapping

Input data mapping allows explicit mapping of values for the inputs of the next step. These values can come from a number of sources:

- The outputs of a previous step
- The runtime context
- A constant value
- The initial input of the workflow

## Mapping with `.map()`

In this example the `output` from `step1` is transformed to match the `inputSchema` required for the `step2`. The value from `step1` is available using the `inputData` parameter of the `.map` function.

![Mapping with .map()](/image/workflows/workflows-data-mapping-map.jpg)

```typescript {9} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
const step1 = createStep({...});
const step2 = createStep({...});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .map(async ({ inputData }) => {
    const { value } = inputData;
    return {
      output: `new ${value}`
    };
  })
  .then(step2)
  .commit();
```

## Using `inputData`

Use `inputData` to access the full output of the previous step:

```typescript {3} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
  .then(step1)
  .map(({ inputData }) => {
    console.log(inputData);
  })
```

## Using `getStepResult()`

Use `getStepResult` to access the full output of a specific step by referencing the step's instance:

```typescript {3} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
  .then(step1)
  .map(async ({ getStepResult }) => {
    console.log(getStepResult(step1));
  })
```

## Using `getInitData()`

Use `getInitData` to access the initial input data provided to the workflow:

```typescript {3} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
  .then(step1)
  .map(async ({ getInitData }) => {
      console.log(getInitData());
  })
```

## Using `mapVariable()`

To use `mapVariable` import the necessary function from the workflows module:

```typescript filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { mapVariable } from "@mastra/core/workflows";
```

### Renaming step with `mapVariable()`

You can rename step outputs using the object syntax in `.map()`. In the example below, the `value` output from `step1` is renamed to `details`:

```typescript {3-6} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
  .then(step1)
  .map({
    details: mapVariable({
      step: step,
      path: "value"
    })
  })
```

### Renaming workflows with `mapVariable()`

You can rename workflow outputs by using **referential composition**. This involves passing the workflow instance as the `initData`.

```typescript {6-9} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
export const testWorkflow = createWorkflow({...});

testWorkflow
  .then(step1)
  .map({
    details: mapVariable({
      initData: testWorkflow,
      path: "value"
    })
  })
```


---
title: "Handling Complex LLM Operations | Workflows | Mastra"
description: "Workflows in Mastra help you orchestrate complex sequences of operations with features like branching, parallel execution, resource suspension, and more."
---

import { Steps } from "nextra/components";

# Workflows overview
[EN] Source: https://mastra.ai/en/docs/workflows/overview

Workflows let you define and orchestrate complex sequences of tasks as **typed steps** connected by data flows. Each step has clearly defined inputs and outputs validated by Zod schemas.

A workflow manages execution order, dependencies, branching, parallelism, and error handling — enabling you to build robust, reusable processes. Steps can be nested or cloned to compose larger workflows.

![Workflows overview](/image/workflows/workflows-overview.jpg)

You create workflows by:

- Defining **steps** with `createStep`, specifying input/output schemas and business logic.
- Composing **steps** with `createWorkflow` to define the execution flow.
- Running **workflows** to execute the entire sequence, with built-in support for suspension, resumption, and streaming results.

This structure provides full type safety and runtime validation, ensuring data integrity across the entire workflow.


## Getting started

To use workflows, first import the necessary functions from the workflows module:

```typescript filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
```

### Create step

Steps are the building blocks of workflows. Create a step using `createStep`:

```typescript filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
const step1 = createStep({...});
```

> See [createStep](/reference/workflows/step) for more information.

### Create workflow

Create a workflow using `createWorkflow` and complete it with `.commit()`.

```typescript {6,17} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});

export const testWorkflow = createWorkflow({
  id: "test-workflow",
  description: 'Test workflow',
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    output: z.string()
  })
})
  .then(step1)
  .commit();
```

> See [workflow](/reference/workflows/workflow) for more information.

#### Composing steps

Workflow steps can be composed and executed sequentially using `.then()`.

```typescript {17,18} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const step2 = createStep({...});

export const testWorkflow = createWorkflow({
  id: "test-workflow",
  description: 'Test workflow',
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    output: z.string()
  })
})
  .then(step1)
  .then(step2)
  .commit();
```

> Steps can be composed using a number of different methods. See [Control Flow](/docs/workflows/control-flow)  for more information.

#### Cloning steps

Workflow steps can be cloned using `cloneStep()`, and used with any workflow method.

```typescript {5,19} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep, cloneStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const clonedStep = cloneStep(step1, { id: "cloned-step" });
const step2 = createStep({...});

export const testWorkflow = createWorkflow({
  id: "test-workflow",
  description: 'Test workflow',
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    output: z.string()
  })
})
  .then(step1)
  .then(clonedStep)
  .then(step2)
  .commit();
```

### Register workflow

Register a workflow using `workflows` in the main Mastra instance:

```typescript {8} filename="src/mastra/index.ts" showLineNumbers copy
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";

import { testWorkflow } from "./workflows/test-workflow";

export const mastra = new Mastra({
  workflows: { testWorkflow },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:"
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info"
  })
});
```

### Run workflow
There are two ways to run and test workflows.

<Steps>

#### Mastra Playground

With the Mastra Dev Server running you can run the workflow from the Mastra Playground by visiting [http://localhost:5000/workflows](http://localhost:5000/workflows) in your browser.

#### Command line

Create a run instance of any Mastra workflow using `createRunAsync` and `start`:

```typescript {3,5} filename="src/test-workflow.ts" showLineNumbers copy
import { mastra } from "./mastra";

const run = await mastra.getWorkflow("testWorkflow").createRunAsync();

const result = await run.start({
  inputData: {
    city: "London"
  }
});

console.log(JSON.stringify(result, null, 2));
```
> see [createRunAsync](/reference/workflows/create-run) and [start](/reference/workflows/start) for more information.

To trigger this workflow, run the following:

```bash copy
npx tsx src/test-workflow.ts
```

</Steps>

#### Run workflow results

The result of running a workflow using either `start()` or `resume()` will look like one of the following, depending on the outcome.

##### Status success

```json
{
  "status": "success",
  "steps": {
    // ...
    "step-1": {
      // ...
      "status": "success",
    }
  },
  "result": {
    "output": "London + step-1"
  }
}
```

- **status**: Shows the final state of the workflow execution, either: `success`, `suspended`, or `error`
- **steps**: Lists each step in the workflow, including inputs and outputs
- **status**: Shows the outcome of each individual step
- **result**: Includes the final output of the workflow, typed according to the `outputSchema`


##### Status suspended

```json
{
  "status": "suspended",
  "steps": {
    // ...
    "step-1": {
      // ...
      "status": "suspended",
    }
  },
  "suspended": [
    [
      "step-1"
    ]
  ]
}
```

- **suspended**: An optional array listing any steps currently awaiting input before continuing

##### Status failed

```json
{
  "status": "failed",
  "steps": {
    // ...
    "step-1": {
      // ...
      "status": "failed",
      "error": "Test error",
    }
  },
  "error": "Test error"
}
```
- **error**: An optional field that includes the error message if the workflow fails

### Stream workflow

Similar to the run method shown above, workflows can also be streamed:

```typescript {5} filename="src/test-workflow.ts" showLineNumbers copy
import { mastra } from "./mastra";

const run = await mastra.getWorkflow("testWorkflow").createRunAsync();

const result = await run.stream({
  inputData: {
    city: "London"
  }
});

for await (const chunk of result.stream) {
  console.log(chunk);
}
```

> See [stream](/reference/workflows/stream) and [messages](/reference/workflows/stream#messages) for more information.

### Watch Workflow

A workflow can also be watched, allowing you to inspect each event that is emitted.

```typescript {5} filename="src/test-workflow.ts" showLineNumbers copy
import { mastra } from "./mastra";

const run = await mastra.getWorkflow("testWorkflow").createRunAsync();

run.watch((event) => {
  console.log(event);
});

const result = await run.start({
  inputData: {
    city: "London"
  }
});
```

> See [watch](/reference/workflows/watch) for more information.

## More resources

- The [Workflow Guide](../../guides/guide/ai-recruiter.mdx) in the Guides section is a tutorial that covers the main concepts.
- [Parallel Steps workflow example](../../examples/workflows/parallel-steps.mdx)
- [Conditional Branching workflow example](../../examples/workflows/conditional-branching.mdx)
- [Inngest workflow example](../../examples/workflows/inngest-workflow.mdx)
- [Suspend and Resume workflow example](../../examples/workflows/human-in-the-loop.mdx)


## Workflows (Legacy)

For legacy workflow documentation, see [Workflows (Legacy)](/docs/workflows-legacy/overview).



---
title: "Pausing Execution | Mastra Docs"
description: "Pausing execution in Mastra workflows allows you to pause execution while waiting for external input or resources via .sleep(), .sleepUntil() and .waitForEvent()."
---

# Sleep & Events
[EN] Source: https://mastra.ai/en/docs/workflows/pausing-execution

Mastra lets you pause workflow execution when waiting for external input or timing conditions. This can be useful for things like polling, delayed retries, or waiting on user actions.

You can pause execution using:

- `sleep()`: Pause for a set number of milliseconds
- `sleepUntil()`: Pause until a specific timestamp
- `waitForEvent()`: Pause until an external event is received
- `sendEvent()`: Send an event to resume a waiting workflow

When using any of these methods, the workflow status is set to `waiting` until execution resumes.

## Pausing with `.sleep()`

The `sleep()` method pauses execution between steps for a specified number of milliseconds.

```typescript {9} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const step2 = createStep({...});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .sleep(1000)
  .then(step2)
  .commit();
```

### Pausing with `.sleep(callback)`

The `sleep()` method also accepts a callback that returns the number of milliseconds to pause. The callback receives `inputData`, allowing the delay to be computed dynamically.

```typescript {9} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const step2 = createStep({...});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .sleep(async ({ inputData }) => {
    const { delayInMs }  = inputData
    return delayInMs;
  })
  .then(step2)
  .commit();
```

## Pausing with `.sleepUntil()`

The `sleepUntil()` method pauses execution between steps until a specified date.

```typescript {9} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const step2 = createStep({...});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .sleepUntil(new Date(Date.now() + 5000))
  .then(step2)
  .commit();
```

### Pausing with `.sleepUntil(callback)`

The `sleepUntil()` method also accepts a callback that returns a `Date` object. The callback receives `inputData`, allowing the target time to be computed dynamically.

```typescript {9} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const step2 = createStep({...});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .sleepUntil(async ({ inputData }) => {
    const { delayInMs }  = inputData
    return new Date(Date.now() + delayInMs);
  })
  .then(step2)
  .commit();
```


> `Date.now()` is evaluated when the workflow starts, not at the moment the `sleepUntil()` method is called.

## Pausing with `.waitForEvent()`

The `waitForEvent()` method pauses execution until a specific event is received. Use `run.sendEvent()` to send the event. You must provide both the event name and the step to resume.

![Pausing with .waitForEvent()](/image/workflows/workflows-sleep-events-waitforevent.jpg)

```typescript {10} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const step1 = createStep({...});
const step2 = createStep({...});
const step3 = createStep({...});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .waitForEvent("my-event-name", step2)
  .then(step3)
  .commit();
```
## Sending an event with `.sendEvent()`

The `.sendEvent()` method sends an event to the workflow. It accepts the event name and optional event data, which can be any JSON-serializable value.

```typescript {5,12,15} filename="src/test-workflow.ts" showLineNumbers copy
import { mastra } from "./mastra";

const run = await mastra.getWorkflow("testWorkflow").createRunAsync();

const result = run.start({
  inputData: {
    value: "hello"
  }
});

setTimeout(() => {
  run.sendEvent("my-event-name", { value: "from event" });
}, 3000);

console.log(JSON.stringify(await result, null, 2));
```

> In this example, avoid using `await run.start()` directly, it would block sending the event before the workflow reaches its waiting state.


---
title: "Suspend & Resume Workflows | Human-in-the-Loop | Mastra Docs"
description: "Suspend and resume in Mastra workflows allows you to pause execution while waiting for external input or resources."
---

# Suspend & Resume
[EN] Source: https://mastra.ai/en/docs/workflows/suspend-and-resume

Workflows can be paused at any step, with their current state persisted as a snapshot in storage. Execution can then be resumed from this saved snapshot when ready. Persisting the snapshot ensures the workflow state is maintained across sessions, deployments, and server restarts, essential for workflows that may remain suspended while awaiting external input or resources.

Common scenarios for suspending workflows include:

- Waiting for human approval or input
- Pausing until external API resources become available
- Collecting additional data needed for later steps
- Rate limiting or throttling expensive operations
- Handling event-driven processes with external triggers

## Workflow status types

When running a workflow, its `status` can be one of the following:

- `running` - The workflow is currently running
- `suspended` - The workflow is suspended
- `success` - The workflow has completed
- `failed` - The workflow has failed

## Suspending a workflow with `suspend()`

When the state is `suspended`, you can identify any and all steps that have been suspended by looking at the `suspended` array of the workflow result output.

![Suspending a workflow with suspend()](/image/workflows/workflows-suspend-resume-suspend.jpg)

```typescript {18} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
const step1 = createStep({
  id: "step-1",
  description: "Test suspend",
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    output: z.string()
  }),
  suspendSchema: z.object({}),
  resumeSchema: z.object({
    city: z.string()
  }),
  execute: async ({ resumeData, suspend }) => {
    const { city } = resumeData ?? {};

    if (!city) {
      await suspend({});
      return { output: "" };
    }

    return { output: "" };
  }
});

export const testWorkflow = createWorkflow({})
  .then(step1)
  .commit();
```

> See [Define Suspendable workflow](/examples/workflows/human-in-the-loop#define-suspendable-workflow) for more information.

### Identifying suspended steps

To resume a suspended workflow, inspect the `suspended` array in the result to determine which step needs input:

```typescript {15} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { mastra } from "./mastra";

const run = await mastra.getWorkflow("testWorkflow").createRunAsync();

const result = await run.start({
  inputData: {
    city: "London"
  }
});

console.log(JSON.stringify(result, null, 2));

if (result.status === "suspended") {
  const resumedResult = await run.resume({
    step: result.suspended[0],
    resumeData: {
      city: "Berlin"
    }
  });
}

```

In this case, the logic resumes the first step listed in the `suspended` array. A `step` can also be defined using it's `id`, for example: 'step-1'.

```json
{
  "status": "suspended",
  "steps": {
    // ...
    "step-1": {
      // ...
      "status": "suspended",
    }
  },
  "suspended": [
    [
      "step-1"
    ]
  ]
}
```

> See [Run Workflow Results](/workflows/overview#run-workflow-results) for more details.

## Resuming a workflow with `resume()`

A workflow can be resumed by calling `resume` and providing the required `resumeData`.

```typescript {16-18} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { mastra } from "./mastra";

const run = await mastra.getWorkflow("testWorkflow").createRunAsync();

const result = await run.start({
   inputData: {
    city: "London"
  }
});

console.log(JSON.stringify(result, null, 2));

if (result.status === "suspended") {
  const resumedResult = await run.resume({
    step: 'step-1',
    resumeData: {
      city: "Berlin"
    }
  });

  console.log(JSON.stringify(resumedResult, null, 2));
}
```

### Resuming nested workflows

To resume a suspended nested workflow pass the workflow instance to the `step` parameter of the `resume` function.

```typescript {33-34} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
const dowhileWorkflow = createWorkflow({
  id: 'dowhile-workflow',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ value: z.number() }),
})
  .dountil(
    createWorkflow({
      id: 'simple-resume-workflow',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ value: z.number() }),
      steps: [incrementStep, resumeStep],
    })
      .then(incrementStep)
      .then(resumeStep)
      .commit(),
    async ({ inputData }) => inputData.value >= 10,
  )
  .then(
    createStep({
      id: 'final',
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ value: z.number() }),
      execute: async ({ inputData }) => ({ value: inputData.value }),
    }),
  )
  .commit();

const run = await dowhileWorkflow.createRunAsync();
const result = await run.start({ inputData: { value: 0 } });

if (result.status === "suspended") {
  const resumedResult = await run.resume({
    resumeData: { value: 2 },
    step: ['simple-resume-workflow', 'resume'],
  });

  console.log(JSON.stringify(resumedResult, null, 2));
}
```

## Using `RuntimeContext` with suspend/resume

When using suspend/resume with `RuntimeContext`, you can create the instance yourself, and pass it to the `start` and `resume` functions.
`RuntimeContext` is not automatically shared on a workflow run.

```typescript {1,4,9,16} filename="src/mastra/workflows/test-workflow.tss" showLineNumbers copy
import { RuntimeContext } from "@mastra/core/di";
import { mastra } from "./mastra";

const runtimeContext = new RuntimeContext();
const run = await mastra.getWorkflow("testWorkflow").createRunAsync();

const result = await run.start({
  inputData: { suggestions: ["London", "Paris", "New York"] },
  runtimeContext
});

if (result.status === "suspended") {
  const resumedResult = await run.resume({
    step: 'step-1',
    resumeData: { city: "New York" },
    runtimeContext
  });
}
```


---
title: "Using Workflows with Agents and Tools | Workflows | Mastra Docs"
description: "Steps in Mastra workflows provide a structured way to manage operations by defining inputs, outputs, and execution logic."
---

# Agents and Tools
[EN] Source: https://mastra.ai/en/docs/workflows/using-with-agents-and-tools

Workflow steps are composable and typically run logic directly within the `execute` function. However, there are cases where calling an agent or tool is more appropriate. This pattern is especially useful when:

- Generating natural language responses from user input using an LLM.
- Abstracting complex or reusable logic into a dedicated tool.
- Interacting with third-party APIs in a structured or reusable way.

Workflows can use Mastra agents or tools directly as steps, for example: `createStep(testAgent)` or `createStep(testTool)`.

## Using agents in workflows

To include an agent in a workflow, define it in the usual way, then either add it directly to the workflow using `createStep(testAgent)` or, invoke it from within a step's `execute` function using `.generate()`.

### Example agent

This agent uses OpenAI to generate a fact about a city, country, and timezone.

```typescript filename="src/mastra/agents/test-agent.ts" showLineNumbers copy
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

export const testAgent = new Agent({
  name: "test-agent",
  description: "Create facts for a country based on the city",
  instructions: `Return an interesting fact about the country based on the city provided`,
  model: openai("gpt-4o")
});
```

### Adding an agent as a step

In this example, `step1` uses the `testAgent` to generate an interesting fact about the country based on a given city.

The `.map` method transforms the workflow input into a `prompt` string compatible with the `testAgent`.

The step is composed into the workflow using `.then()`, allowing it to receive the mapped input and return the agent's structured output. The workflow is finalized with `.commit()`.


![Agent as step](/image/workflows/workflows-agent-tools-agent-step.jpg)


```typescript {3} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { testAgent } from "../agents/test-agent";

const step1 = createStep(testAgent);

export const testWorkflow = createWorkflow({
  id: "test-workflow",
  description: 'Test workflow',
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    output: z.string()
  })
})
  .map(({ inputData }) => {
    const { input } = inputData;
    return {
      prompt: `Provide facts about the city: ${input}`
    };
  })
  .then(step1)
  .commit();
```

### Calling an agent with `.generate()`

In this example, the `step1` builds a prompt using the provided `input` and passes it to the `testAgent`, which returns a plain-text response containing facts about the city and its country.

The step is added to the workflow using the sequential `.then()` method, allowing it to receive input from the workflow and return structured output. The workflow is finalized with `.commit()`.

```typescript {1,18, 29} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { testAgent } from "../agents/test-agent";

const step1 = createStep({
  id: "step-1",
  description: "Create facts for a country based on the city",
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    output: z.string()
  }),

  execute: async ({ inputData }) => {
    const { input } = inputData;

    const  prompt = `Provide facts about the city: ${input}`

    const { text } = await testAgent.generate([
      { role: "user", content: prompt }
    ]);

    return {
      output: text
    };
  }
});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .commit();
```

## Using tools in workflows

To use a tool within a workflow, define it in the usual way, then either add it directly to the workflow using `createStep(testTool)` or, invoke it from within a step's `execute` function using `.execute()`.

### Example tool

The example below uses the Open Meteo API to retrieve geolocation details for a city, returning its name, country, and timezone.

```typescript filename="src/mastra/tools/test-tool.ts" showLineNumbers copy
import { createTool } from "@mastra/core";
import { z } from "zod";

export const testTool = createTool({
  id: "test-tool",
  description: "Gets country for a city",
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    country_name: z.string()
  }),
  execute: async ({ context }) => {
    const { input } = context;
    const geocodingResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${input}`);
    const geocodingData = await geocodingResponse.json();

    const { country } = geocodingData.results[0];

    return {
      country_name: country
    };
  }
});
```

### Adding a tool as a step

In this example, `step1` uses the `testTool`, which performs a geocoding lookup using the provided `city` and returns the resolved `country`.

The step is added to the workflow using the sequential `.then()` method, allowing it to receive input from the workflow and return structured output. The workflow is finalized with `.commit()`.

![Tool as step](/image/workflows/workflows-agent-tools-tool-step.jpg)

```typescript {1,3,6} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { testTool } from "../tools/test-tool";

const step1 = createStep(testTool);

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .commit();
```

### Calling a tool with `.execute()`

In this example, `step1` directly invokes `testTool` using its `.execute()` method. The tool performs a geocoding lookup with the provided `city` and returns the corresponding `country`.

The result is returned as structured output from the step. The step is composed into the workflow using `.then()`, enabling it to process workflow input and produce typed output. The workflow is finalized with `.commit()`

```typescript {3,20,32} filename="src/mastra/workflows/test-workflow.ts" showLineNumbers copy
import { RuntimeContext } from "@mastra/core/di";

import { testTool } from "../tools/test-tool";

const runtimeContext = new RuntimeContext();

const step1 = createStep({
  id: "step-1",
  description: "Gets country for a city",
  inputSchema: z.object({
    input: z.string()
  }),
  outputSchema: z.object({
    output: z.string()
  }),

  execute: async ({ inputData }) => {
    const { input } = inputData;

    const { country_name } = await testTool.execute({
      context: { input },
      runtimeContext
    });

    return {
      output: country_name
    };
  }
});

export const testWorkflow = createWorkflow({...})
  .then(step1)
  .commit();
```

## Using workflows as tools

In this example the `cityStringWorkflow` workflow has been added to the main Mastra instance.


```typescript {7} filename="src/mastra/index.ts" showLineNumbers copy
import { Mastra } from "@mastra/core/mastra";

import { testWorkflow, cityStringWorkflow } from "./workflows/test-workflow";

export const mastra = new Mastra({
  ...
  workflows: { testWorkflow, cityStringWorkflow },
});
```

Once a workflow has been registered it can be referenced using `getWorkflow` from withing a tool.

```typescript {10,17-27} filename="src/mastra/tools/test-tool.ts" showLineNumbers copy
export const cityCoordinatesTool = createTool({
  id: "city-tool",
  description: "Convert city details",
  inputSchema: z.object({
    city: z.string()
  }),
  outputSchema: z.object({
    outcome: z.string()
  }),
  execute: async ({ context, mastra }) => {
    const { city } = context;
    const geocodingResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}`);
    const geocodingData = await geocodingResponse.json();

    const { name, country, timezone } = geocodingData.results[0];

    const workflow = mastra?.getWorkflow("cityStringWorkflow");

    const run = await workflow?.createRunAsync();

    const { result } = await run?.start({
      inputData: {
        city_name: name,
        country_name: country,
        country_timezone: timezone
      }
    });

    return {
      outcome: result.outcome
    };
  }
});
```

## Exposing workflows with `MCPServer`

You can convert your workflows into tools by passing them into an instance of a Mastra `MCPServer`. This allows any MCP-compatible client to access your workflow.

The workflow description becomes the tool description and the input schema becomes the tool's input schema.

When you provide workflows to the server, each workflow is automatically exposed as a callable tool for example:

- `run_testWorkflow`.

```typescript filename="src/test-mcp-server.ts" showLineNumbers copy
import { MCPServer } from "@mastra/mcp";

import { testAgent } from "./mastra/agents/test-agent";
import { testTool } from "./mastra/tools/test-tool";
import { testWorkflow } from "./mastra/workflows/test-workflow";

async function startServer() {
  const server = new MCPServer({
    name: "test-mcp-server",
    version: "1.0.0",
    workflows: {
      testWorkflow
    }
  });

  await server.startStdio();
  console.log("MCPServer started on stdio");
}

startServer().catch(console.error);
```

To verify that your workflow is available on the server, you can connect with an MCPClient.

```typescript filename="src/test-mcp-client.ts" showLineNumbers copy
import { MCPClient } from "@mastra/mcp";

async function main() {
  const mcp = new MCPClient({
    servers: {
      local: {
        command: "npx",
        args: ["tsx", "src/test-mcp-server.ts"]
      }
    }
  });

  const tools = await mcp.getTools();
  console.log(tools);
}

main().catch(console.error);
```

Run the client script to see your workflow tool.

```bash
npx tsx src/test-mcp-client.ts
```

## More resources

- [MCPServer reference documentation](/reference/tools/mcp-server).
- [MCPClient reference documentation](/reference/tools/mcp-client).


---
title: "Branching, Merging, Conditions | Workflows (Legacy) | Mastra Docs"
description: "Control flow in Mastra legacy workflows allows you to manage branching, merging, and conditions to construct legacy workflows that meet your logic requirements."
---

# Control Flow in Legacy Workflows: Branching, Merging, and Conditions
[EN] Source: https://mastra.ai/en/docs/workflows-legacy/control-flow

When you create a multi-step process, you may need to run steps in parallel, chain them sequentially, or follow different paths based on outcomes. This page describes how you can manage branching, merging, and conditions to construct workflows that meet your logic requirements. The code snippets show the key patterns for structuring complex control flow.

## Parallel Execution

You can run multiple steps at the same time if they don't depend on each other. This approach can speed up your workflow when steps perform independent tasks. The code below shows how to add two steps in parallel:

```typescript
myWorkflow.step(fetchUserData).step(fetchOrderData);
```

See the [Parallel Steps](../../examples/workflows_legacy/parallel-steps.mdx) example for more details.

## Sequential Execution

Sometimes you need to run steps in strict order to ensure outputs from one step become inputs for the next. Use .then() to link dependent operations. The code below shows how to chain steps sequentially:

```typescript
myWorkflow.step(fetchOrderData).then(validateData).then(processOrder);
```

See the [Sequential Steps](../../examples/workflows_legacy/sequential-steps.mdx) example for more details.

## Branching and Merging Paths

When different outcomes require different paths, branching is helpful. You can also merge paths later once they complete. The code below shows how to branch after stepA and later converge on stepF:

```typescript
myWorkflow
  .step(stepA)
  .then(stepB)
  .then(stepD)
  .after(stepA)
  .step(stepC)
  .then(stepE)
  .after([stepD, stepE])
  .step(stepF);
```

In this example:

- stepA leads to stepB, then to stepD.
- Separately, stepA also triggers stepC, which in turn leads to stepE.
- Separately, stepF is triggered when both stepD and stepE are completed.

See the [Branching Paths](../../examples/workflows_legacy/branching-paths.mdx) example for more details.

## Merging Multiple Branches

Sometimes you need a step to execute only after multiple other steps have completed. Mastra provides a compound `.after([])` syntax that allows you to specify multiple dependencies for a step.

```typescript
myWorkflow
  .step(fetchUserData)
  .then(validateUserData)
  .step(fetchProductData)
  .then(validateProductData)
  // This step will only run after BOTH validateUserData AND validateProductData have completed
  .after([validateUserData, validateProductData])
  .step(processOrder);
```

In this example:

- `fetchUserData` and `fetchProductData` run in parallel branches
- Each branch has its own validation step
- The `processOrder` step only executes after both validation steps have completed successfully

This pattern is particularly useful for:

- Joining parallel execution paths
- Implementing synchronization points in your workflow
- Ensuring all required data is available before proceeding

You can also create complex dependency patterns by combining multiple `.after([])` calls:

```typescript
myWorkflow
  // First branch
  .step(stepA)
  .then(stepB)
  .then(stepC)

  // Second branch
  .step(stepD)
  .then(stepE)

  // Third branch
  .step(stepF)
  .then(stepG)

  // This step depends on the completion of multiple branches
  .after([stepC, stepE, stepG])
  .step(finalStep);
```

## Cyclical Dependencies and Loops

Workflows often need to repeat steps until certain conditions are met. Mastra provides two powerful methods for creating loops: `until` and `while`. These methods offer an intuitive way to implement repetitive tasks.

### Using Manual Cyclical Dependencies (Legacy Approach)

In earlier versions, you could create loops by manually defining cyclical dependencies with conditions:

```typescript
myWorkflow
  .step(fetchData)
  .then(processData)
  .after(processData)
  .step(finalizeData, {
    when: { "processData.status": "success" },
  })
  .step(fetchData, {
    when: { "processData.status": "retry" },
  });
```

While this approach still works, the newer `until` and `while` methods provide a cleaner and more maintainable way to create loops.

### Using `until` for Condition-Based Loops

The `until` method repeats a step until a specified condition becomes true. It takes these arguments:

1. A condition that determines when to stop looping
2. The step to repeat
3. Optional variables to pass to the repeated step

```typescript
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Step that increments a counter until target is reached
const incrementStep = new LegacyStep({
  id: "increment",
  inputSchema: z.object({
    // Current counter value
    counter: z.number().optional(),
  }),
  outputSchema: z.object({
    // Updated counter value
    updatedCounter: z.number(),
  }),
  execute: async ({ context }) => {
    const { counter = 0 } = context.inputData;
    return { updatedCounter: counter + 1 };
  },
});

workflow
  .step(incrementStep)
  .until(
    async ({ context }) => {
      // Stop when counter reaches 10
      const result = context.getStepResult(incrementStep);
      return (result?.updatedCounter ?? 0) >= 10;
    },
    incrementStep,
    {
      // Pass current counter to next iteration
      counter: {
        step: incrementStep,
        path: "updatedCounter",
      },
    },
  )
  .then(finalStep);
```

You can also use a reference-based condition:

```typescript
workflow
  .step(incrementStep)
  .until(
    {
      ref: { step: incrementStep, path: "updatedCounter" },
      query: { $gte: 10 },
    },
    incrementStep,
    {
      counter: {
        step: incrementStep,
        path: "updatedCounter",
      },
    },
  )
  .then(finalStep);
```

### Using `while` for Condition-Based Loops

The `while` method repeats a step as long as a specified condition remains true. It takes the same arguments as `until`:

1. A condition that determines when to continue looping
2. The step to repeat
3. Optional variables to pass to the repeated step

```typescript
// Step that increments a counter while below target
const incrementStep = new LegacyStep({
  id: "increment",
  inputSchema: z.object({
    // Current counter value
    counter: z.number().optional(),
  }),
  outputSchema: z.object({
    // Updated counter value
    updatedCounter: z.number(),
  }),
  execute: async ({ context }) => {
    const { counter = 0 } = context.inputData;
    return { updatedCounter: counter + 1 };
  },
});

workflow
  .step(incrementStep)
  .while(
    async ({ context }) => {
      // Continue while counter is less than 10
      const result = context.getStepResult(incrementStep);
      return (result?.updatedCounter ?? 0) < 10;
    },
    incrementStep,
    {
      // Pass current counter to next iteration
      counter: {
        step: incrementStep,
        path: "updatedCounter",
      },
    },
  )
  .then(finalStep);
```

You can also use a reference-based condition:

```typescript
workflow
  .step(incrementStep)
  .while(
    {
      ref: { step: incrementStep, path: "updatedCounter" },
      query: { $lt: 10 },
    },
    incrementStep,
    {
      counter: {
        step: incrementStep,
        path: "updatedCounter",
      },
    },
  )
  .then(finalStep);
```

### Comparison Operators for Reference Conditions

When using reference-based conditions, you can use these comparison operators:

| Operator | Description              |
| -------- | ------------------------ |
| `$eq`    | Equal to                 |
| `$ne`    | Not equal to             |
| `$gt`    | Greater than             |
| `$gte`   | Greater than or equal to |
| `$lt`    | Less than                |
| `$lte`   | Less than or equal to    |

## Conditions

Use the when property to control whether a step runs based on data from previous steps. Below are three ways to specify conditions.

### Option 1: Function

```typescript
myWorkflow.step(
  new Step({
    id: "processData",
    execute: async ({ context }) => {
      // Action logic
    },
  }),
  {
    when: async ({ context }) => {
      const fetchData = context?.getStepResult<{ status: string }>("fetchData");
      return fetchData?.status === "success";
    },
  },
);
```

### Option 2: Query Object

```typescript
myWorkflow.step(
  new Step({
    id: "processData",
    execute: async ({ context }) => {
      // Action logic
    },
  }),
  {
    when: {
      ref: {
        step: {
          id: "fetchData",
        },
        path: "status",
      },
      query: { $eq: "success" },
    },
  },
);
```

### Option 3: Simple Path Comparison

```typescript
myWorkflow.step(
  new Step({
    id: "processData",
    execute: async ({ context }) => {
      // Action logic
    },
  }),
  {
    when: {
      "fetchData.status": "success",
    },
  },
);
```

## Data Access Patterns

Mastra provides several ways to pass data between steps:

1. **Context Object** - Access step results directly through the context object
2. **Variable Mapping** - Explicitly map outputs from one step to inputs of another
3. **getStepResult Method** - Type-safe method to retrieve step outputs

Each approach has its advantages depending on your use case and requirements for type safety.

### Using getStepResult Method

The `getStepResult` method provides a type-safe way to access step results. This is the recommended approach when working with TypeScript as it preserves type information.

#### Basic Usage

For better type safety, you can provide a type parameter to `getStepResult`:

```typescript showLineNumbers filename="src/mastra/workflows/get-step-result.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const fetchUserStep = new LegacyStep({
  id: "fetchUser",
  outputSchema: z.object({
    name: z.string(),
    userId: z.string(),
  }),
  execute: async ({ context }) => {
    return { name: "John Doe", userId: "123" };
  },
});

const analyzeDataStep = new LegacyStep({
  id: "analyzeData",
  execute: async ({ context }) => {
    // Type-safe access to previous step result
    const userData = context.getStepResult<{ name: string; userId: string }>(
      "fetchUser",
    );

    if (!userData) {
      return { status: "error", message: "User data not found" };
    }

    return {
      analysis: `Analyzed data for user ${userData.name}`,
      userId: userData.userId,
    };
  },
});
```

#### Using Step References

The most type-safe approach is to reference the step directly in the `getStepResult` call:

```typescript showLineNumbers filename="src/mastra/workflows/step-reference.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Define step with output schema
const fetchUserStep = new LegacyStep({
  id: "fetchUser",
  outputSchema: z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  execute: async () => {
    return {
      userId: "user123",
      name: "John Doe",
      email: "john@example.com",
    };
  },
});

const processUserStep = new LegacyStep({
  id: "processUser",
  execute: async ({ context }) => {
    // TypeScript will infer the correct type from fetchUserStep's outputSchema
    const userData = context.getStepResult(fetchUserStep);

    return {
      processed: true,
      userName: userData?.name,
    };
  },
});

const workflow = new LegacyWorkflow({
  name: "user-workflow",
});

workflow.step(fetchUserStep).then(processUserStep).commit();
```

### Using Variable Mapping

Variable mapping is an explicit way to define data flow between steps.
This approach makes dependencies clear and provides good type safety.
The data injected into the step is available in the `context.inputData` object, and typed based on the `inputSchema` of the step.

```typescript showLineNumbers filename="src/mastra/workflows/variable-mapping.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const fetchUserStep = new LegacyStep({
  id: "fetchUser",
  outputSchema: z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  execute: async () => {
    return {
      userId: "user123",
      name: "John Doe",
      email: "john@example.com",
    };
  },
});

const sendEmailStep = new LegacyStep({
  id: "sendEmail",
  inputSchema: z.object({
    recipientEmail: z.string(),
    recipientName: z.string(),
  }),
  execute: async ({ context }) => {
    const { recipientEmail, recipientName } = context.inputData;

    // Send email logic here
    return {
      status: "sent",
      to: recipientEmail,
    };
  },
});

const workflow = new LegacyWorkflow({
  name: "email-workflow",
});

workflow
  .step(fetchUserStep)
  .then(sendEmailStep, {
    variables: {
      // Map specific fields from fetchUser to sendEmail inputs
      recipientEmail: { step: fetchUserStep, path: "email" },
      recipientName: { step: fetchUserStep, path: "name" },
    },
  })
  .commit();
```

For more details on variable mapping, see the [Data Mapping with Workflow Variables](./variables.mdx) documentation.

### Using the Context Object

The context object provides direct access to all step results and their outputs. This approach is more flexible but requires careful handling to maintain type safety.
You can access step results directly through the `context.steps` object:

```typescript showLineNumbers filename="src/mastra/workflows/context-access.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const processOrderStep = new LegacyStep({
  id: "processOrder",
  execute: async ({ context }) => {
    // Access data from a previous step
    let userData: { name: string; userId: string };
    if (context.steps["fetchUser"]?.status === "success") {
      userData = context.steps.fetchUser.output;
    } else {
      throw new Error("User data not found");
    }

    return {
      orderId: "order123",
      userId: userData.userId,
      status: "processing",
    };
  },
});

const workflow = new LegacyWorkflow({
  name: "order-workflow",
});

workflow.step(fetchUserStep).then(processOrderStep).commit();
```

### Workflow-Level Type Safety

For comprehensive type safety across your entire workflow, you can define types for all steps and pass them to the Workflow
This allows you to get type safety for the context object on conditions, and on step results in the final workflow output.

```typescript showLineNumbers filename="src/mastra/workflows/workflow-typing.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Create steps with typed outputs
const fetchUserStep = new LegacyStep({
  id: "fetchUser",
  outputSchema: z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  execute: async () => {
    return {
      userId: "user123",
      name: "John Doe",
      email: "john@example.com",
    };
  },
});

const processOrderStep = new LegacyStep({
  id: "processOrder",
  execute: async ({ context }) => {
    // TypeScript knows the shape of userData
    const userData = context.getStepResult(fetchUserStep);

    return {
      orderId: "order123",
      status: "processing",
    };
  },
});

const workflow = new LegacyWorkflow<
  [typeof fetchUserStep, typeof processOrderStep]
>({
  name: "typed-workflow",
});

workflow
  .step(fetchUserStep)
  .then(processOrderStep)
  .until(async ({ context }) => {
    // TypeScript knows the shape of userData here
    const res = context.getStepResult("fetchUser");
    return res?.userId === "123";
  }, processOrderStep)
  .commit();
```

### Accessing Trigger Data

In addition to step results, you can access the original trigger data that started the workflow:

```typescript showLineNumbers filename="src/mastra/workflows/trigger-data.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Define trigger schema
const triggerSchema = z.object({
  customerId: z.string(),
  orderItems: z.array(z.string()),
});

type TriggerType = z.infer<typeof triggerSchema>;

const processOrderStep = new LegacyStep({
  id: "processOrder",
  execute: async ({ context }) => {
    // Access trigger data with type safety
    const triggerData = context.getStepResult<TriggerType>("trigger");

    return {
      customerId: triggerData?.customerId,
      itemCount: triggerData?.orderItems.length || 0,
      status: "processing",
    };
  },
});

const workflow = new LegacyWorkflow({
  name: "order-workflow",
  triggerSchema,
});

workflow.step(processOrderStep).commit();
```

### Accessing Resume Data

The data injected into the step is available in the `context.inputData` object, and typed based on the `inputSchema` of the step.

```typescript showLineNumbers filename="src/mastra/workflows/resume-data.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const processOrderStep = new LegacyStep({
  id: "processOrder",
  inputSchema: z.object({
    orderId: z.string(),
  }),
  execute: async ({ context, suspend }) => {
    const { orderId } = context.inputData;

    if (!orderId) {
      await suspend();
      return;
    }

    return {
      orderId,
      status: "processed",
    };
  },
});

const workflow = new LegacyWorkflow({
  name: "order-workflow",
});

workflow.step(processOrderStep).commit();

const run = workflow.createRun();
const result = await run.start();

const resumedResult = await workflow.resume({
  runId: result.runId,
  stepId: "processOrder",
  inputData: {
    orderId: "123",
  },
});

console.log({ resumedResult });
```

### Accessing Workflow Results

You can get typed access to the results of a workflow by injecting the step types into the `Workflow` type params:

```typescript showLineNumbers filename="src/mastra/workflows/get-results.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const fetchUserStep = new LegacyStep({
  id: "fetchUser",
  outputSchema: z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  execute: async () => {
    return {
      userId: "user123",
      name: "John Doe",
      email: "john@example.com",
    };
  },
});

const processOrderStep = new LegacyStep({
  id: "processOrder",
  outputSchema: z.object({
    orderId: z.string(),
    status: z.string(),
  }),
  execute: async ({ context }) => {
    const userData = context.getStepResult(fetchUserStep);
    return {
      orderId: "order123",
      status: "processing",
    };
  },
});

const workflow = new LegacyWorkflow<
  [typeof fetchUserStep, typeof processOrderStep]
>({
  name: "typed-workflow",
});

workflow.step(fetchUserStep).then(processOrderStep).commit();

const run = workflow.createRun();
const result = await run.start();

// The result is a discriminated union of the step results
// So it needs to be narrowed down via status checks
if (result.results.processOrder.status === "success") {
  // TypeScript will know the shape of the results
  const orderId = result.results.processOrder.output.orderId;
  console.log({ orderId });
}

if (result.results.fetchUser.status === "success") {
  const userId = result.results.fetchUser.output.userId;
  console.log({ userId });
}
```

### Best Practices for Data Flow

1. **Use getStepResult with Step References for Type Safety**

   - Ensures TypeScript can infer the correct types
   - Catches type errors at compile time

2. \*_Use Variable Mapping for Explicit Dependencies_

   - Makes data flow clear and maintainable
   - Provides good documentation of step dependencies

3. **Define Output Schemas for Steps**

   - Validates data at runtime
   - Validates return type of the `execute` function
   - Improves type inference in TypeScript

4. **Handle Missing Data Gracefully**

   - Always check if step results exist before accessing properties
   - Provide fallback values for optional data

5. **Keep Data Transformations Simple**
   - Transform data in dedicated steps rather than in variable mappings
   - Makes workflows easier to test and debug

### Comparison of Data Flow Methods

| Method           | Type Safety | Explicitness | Use Case                                          |
| ---------------- | ----------- | ------------ | ------------------------------------------------- |
| getStepResult    | Highest     | High         | Complex workflows with strict typing requirements |
| Variable Mapping | High        | High         | When dependencies need to be clear and explicit   |
| context.steps    | Medium      | Low          | Quick access to step data in simple workflows     |

By choosing the right data flow method for your use case, you can create workflows that are both type-safe and maintainable.


---
title: "Dynamic Workflows (Legacy) | Mastra Docs"
description: "Learn how to create dynamic workflows within legacy workflow steps, allowing for flexible workflow creation based on runtime conditions."
---

# Dynamic Workflows (Legacy)
[EN] Source: https://mastra.ai/en/docs/workflows-legacy/dynamic-workflows

This guide demonstrates how to create dynamic workflows within a workflow step. This advanced pattern allows you to create and execute workflows on the fly based on runtime conditions.

## Overview

Dynamic workflows are useful when you need to create workflows based on runtime data.

## Implementation

The key to creating dynamic workflows is accessing the Mastra instance from within a step's `execute` function and using it to create and run a new workflow.

### Basic Example

```typescript
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const isMastra = (mastra: any): mastra is Mastra => {
  return mastra && typeof mastra === "object" && mastra instanceof Mastra;
};

// Step that creates and runs a dynamic workflow
const createDynamicWorkflow = new LegacyStep({
  id: "createDynamicWorkflow",
  outputSchema: z.object({
    dynamicWorkflowResult: z.any(),
  }),
  execute: async ({ context, mastra }) => {
    if (!mastra) {
      throw new Error("Mastra instance not available");
    }

    if (!isMastra(mastra)) {
      throw new Error("Invalid Mastra instance");
    }

    const inputData = context.triggerData.inputData;

    // Create a new dynamic workflow
    const dynamicWorkflow = new LegacyWorkflow({
      name: "dynamic-workflow",
      mastra, // Pass the mastra instance to the new workflow
      triggerSchema: z.object({
        dynamicInput: z.string(),
      }),
    });

    // Define steps for the dynamic workflow
    const dynamicStep = new LegacyStep({
      id: "dynamicStep",
      execute: async ({ context }) => {
        const dynamicInput = context.triggerData.dynamicInput;
        return {
          processedValue: `Processed: ${dynamicInput}`,
        };
      },
    });

    // Build and commit the dynamic workflow
    dynamicWorkflow.step(dynamicStep).commit();

    // Create a run and execute the dynamic workflow
    const run = dynamicWorkflow.createRun();
    const result = await run.start({
      triggerData: {
        dynamicInput: inputData,
      },
    });

    let dynamicWorkflowResult;

    if (result.results["dynamicStep"]?.status === "success") {
      dynamicWorkflowResult =
        result.results["dynamicStep"]?.output.processedValue;
    } else {
      throw new Error("Dynamic workflow failed");
    }

    // Return the result from the dynamic workflow
    return {
      dynamicWorkflowResult,
    };
  },
});

// Main workflow that uses the dynamic workflow creator
const mainWorkflow = new LegacyWorkflow({
  name: "main-workflow",
  triggerSchema: z.object({
    inputData: z.string(),
  }),
  mastra: new Mastra(),
});

mainWorkflow.step(createDynamicWorkflow).commit();

// Register the workflow with Mastra
export const mastra = new Mastra({
  legacy_workflows: { mainWorkflow },
});

const run = mainWorkflow.createRun();
const result = await run.start({
  triggerData: {
    inputData: "test",
  },
});
```

## Advanced Example: Workflow Factory

You can create a workflow factory that generates different workflows based on input parameters:

```typescript
const isMastra = (mastra: any): mastra is Mastra => {
  return mastra && typeof mastra === "object" && mastra instanceof Mastra;
};

const workflowFactory = new LegacyStep({
  id: "workflowFactory",
  inputSchema: z.object({
    workflowType: z.enum(["simple", "complex"]),
    inputData: z.string(),
  }),
  outputSchema: z.object({
    result: z.any(),
  }),
  execute: async ({ context, mastra }) => {
    if (!mastra) {
      throw new Error("Mastra instance not available");
    }

    if (!isMastra(mastra)) {
      throw new Error("Invalid Mastra instance");
    }

    // Create a new dynamic workflow based on the type
    const dynamicWorkflow = new LegacyWorkflow({
      name: `dynamic-${context.workflowType}-workflow`,
      mastra,
      triggerSchema: z.object({
        input: z.string(),
      }),
    });

    if (context.workflowType === "simple") {
      // Simple workflow with a single step
      const simpleStep = new Step({
        id: "simpleStep",
        execute: async ({ context }) => {
          return {
            result: `Simple processing: ${context.triggerData.input}`,
          };
        },
      });

      dynamicWorkflow.step(simpleStep).commit();
    } else {
      // Complex workflow with multiple steps
      const step1 = new LegacyStep({
        id: "step1",
        outputSchema: z.object({
          intermediateResult: z.string(),
        }),
        execute: async ({ context }) => {
          return {
            intermediateResult: `First processing: ${context.triggerData.input}`,
          };
        },
      });

      const step2 = new LegacyStep({
        id: "step2",
        execute: async ({ context }) => {
          const intermediate = context.getStepResult(step1).intermediateResult;
          return {
            finalResult: `Second processing: ${intermediate}`,
          };
        },
      });

      dynamicWorkflow.step(step1).then(step2).commit();
    }

    // Execute the dynamic workflow
    const run = dynamicWorkflow.createRun();
    const result = await run.start({
      triggerData: {
        input: context.inputData,
      },
    });

    // Return the appropriate result based on workflow type
    if (context.workflowType === "simple") {
      return {
        // @ts-ignore
        result: result.results["simpleStep"]?.output,
      };
    } else {
      return {
        // @ts-ignore
        result: result.results["step2"]?.output,
      };
    }
  },
});
```

## Important Considerations

1. **Mastra Instance**: The `mastra` parameter in the `execute` function provides access to the Mastra instance, which is essential for creating dynamic workflows.

2. **Error Handling**: Always check if the Mastra instance is available before attempting to create a dynamic workflow.

3. **Resource Management**: Dynamic workflows consume resources, so be mindful of creating too many workflows in a single execution.

4. **Workflow Lifecycle**: Dynamic workflows are not automatically registered with the main Mastra instance. They exist only for the duration of the step execution unless you explicitly register them.

5. **Debugging**: Debugging dynamic workflows can be challenging. Consider adding detailed logging to track their creation and execution.

## Use Cases

- **Conditional Workflow Selection**: Choose different workflow patterns based on input data
- **Parameterized Workflows**: Create workflows with dynamic configurations
- **Workflow Templates**: Use templates to generate specialized workflows
- **Multi-tenant Applications**: Create isolated workflows for different tenants

## Conclusion

Dynamic workflows provide a powerful way to create flexible, adaptable workflow systems. By leveraging the Mastra instance within step execution, you can create workflows that respond to runtime conditions and requirements.


---
title: "Error Handling in Workflows (Legacy) | Mastra Docs"
description: "Learn how to handle errors in Mastra legacy workflows using step retries, conditional branching, and monitoring."
---

# Error Handling in Workflows (Legacy)
[EN] Source: https://mastra.ai/en/docs/workflows-legacy/error-handling

Robust error handling is essential for production workflows. Mastra provides several mechanisms to handle errors gracefully, allowing your workflows to recover from failures or gracefully degrade when necessary.

## Overview

Error handling in Mastra workflows can be implemented using:

1. **Step Retries** - Automatically retry failed steps
2. **Conditional Branching** - Create alternative paths based on step success or failure
3. **Error Monitoring** - Watch workflows for errors and handle them programmatically
4. **Result Status Checks** - Check the status of previous steps in subsequent steps

## Step Retries

Mastra provides a built-in retry mechanism for steps that fail due to transient errors. This is particularly useful for steps that interact with external services or resources that might experience temporary unavailability.

### Basic Retry Configuration

You can configure retries at the workflow level or for individual steps:

```typescript
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";

// Workflow-level retry configuration
const workflow = new LegacyWorkflow({
  name: "my-workflow",
  retryConfig: {
    attempts: 3, // Number of retry attempts
    delay: 1000, // Delay between retries in milliseconds
  },
});

// Step-level retry configuration (overrides workflow-level)
const apiStep = new LegacyStep({
  id: "callApi",
  execute: async () => {
    // API call that might fail
  },
  retryConfig: {
    attempts: 5, // This step will retry up to 5 times
    delay: 2000, // With a 2-second delay between retries
  },
});
```

For more details about step retries, see the [Step Retries](../../reference/legacyWorkflows/step-retries.mdx) reference.

## Conditional Branching

You can create alternative workflow paths based on the success or failure of previous steps using conditional logic:

```typescript
// Create a workflow with conditional branching
const workflow = new LegacyWorkflow({
  name: "error-handling-workflow",
});

workflow
  .step(fetchDataStep)
  .then(processDataStep, {
    // Only execute processDataStep if fetchDataStep was successful
    when: ({ context }) => {
      return context.steps.fetchDataStep?.status === "success";
    },
  })
  .then(fallbackStep, {
    // Execute fallbackStep if fetchDataStep failed
    when: ({ context }) => {
      return context.steps.fetchDataStep?.status === "failed";
    },
  })
  .commit();
```

## Error Monitoring

You can monitor workflows for errors using the `watch` method:

```typescript
const { start, watch } = workflow.createRun();

watch(async ({ results }) => {
  // Check for any failed steps
  const failedSteps = Object.entries(results)
    .filter(([_, step]) => step.status === "failed")
    .map(([stepId]) => stepId);

  if (failedSteps.length > 0) {
    console.error(`Workflow has failed steps: ${failedSteps.join(", ")}`);
    // Take remedial action, such as alerting or logging
  }
});

await start();
```

## Handling Errors in Steps

Within a step's execution function, you can handle errors programmatically:

```typescript
const robustStep = new LegacyStep({
  id: "robustStep",
  execute: async ({ context }) => {
    try {
      // Attempt the primary operation
      const result = await someRiskyOperation();
      return { success: true, data: result };
    } catch (error) {
      // Log the error
      console.error("Operation failed:", error);

      // Return a graceful fallback result instead of throwing
      return {
        success: false,
        error: error.message,
        fallbackData: "Default value",
      };
    }
  },
});
```

## Checking Previous Step Results

You can make decisions based on the results of previous steps:

```typescript
const finalStep = new LegacyStep({
  id: "finalStep",
  execute: async ({ context }) => {
    // Check results of previous steps
    const step1Success = context.steps.step1?.status === "success";
    const step2Success = context.steps.step2?.status === "success";

    if (step1Success && step2Success) {
      // All steps succeeded
      return { status: "complete", result: "All operations succeeded" };
    } else if (step1Success) {
      // Only step1 succeeded
      return { status: "partial", result: "Partial completion" };
    } else {
      // Critical failure
      return { status: "failed", result: "Critical steps failed" };
    }
  },
});
```

## Best Practices for Error Handling

1. **Use retries for transient failures**: Configure retry policies for steps that might experience temporary issues.

2. **Provide fallback paths**: Design workflows with alternative paths for when critical steps fail.

3. **Be specific about error scenarios**: Use different handling strategies for different types of errors.

4. **Log errors comprehensively**: Include context information when logging errors to aid in debugging.

5. **Return meaningful data on failure**: When a step fails, return structured data about the failure to help downstream steps make decisions.

6. **Consider idempotency**: Ensure steps can be safely retried without causing duplicate side effects.

7. **Monitor workflow execution**: Use the `watch` method to actively monitor workflow execution and detect errors early.

## Advanced Error Handling

For more complex error handling scenarios, consider:

- **Implementing circuit breakers**: If a step fails repeatedly, stop retrying and use a fallback strategy
- **Adding timeout handling**: Set time limits for steps to prevent workflows from hanging indefinitely
- **Creating dedicated error recovery workflows**: For critical workflows, create separate recovery workflows that can be triggered when the main workflow fails

## Related

- [Step Retries Reference](../../reference/legacyWorkflows/step-retries.mdx)
- [Watch Method Reference](../../reference/legacyWorkflows/watch.mdx)
- [Step Conditions](../../reference/legacyWorkflows/step-condition.mdx)
- [Control Flow](./control-flow.mdx)


# Handling Complex LLM Operations with Workflows (Legacy)
[EN] Source: https://mastra.ai/en/docs/workflows-legacy/overview

All the legacy workflow documentation is available on the links below.

- [Steps](/docs/workflows-legacy/steps/)
- [Control Flow](/docs/workflows-legacy/control-flow/)
- [Variables](/docs/workflows-legacy/variables/)
- [Suspend & Resume](/docs/workflows-legacy/suspend-and-resume/)
- [Dynamic Workflows](/docs/workflows-legacy/dynamic-workflows/)
- [Error Handling](/docs/workflows-legacy/error-handling/)
- [Nested Workflows](/docs/workflows-legacy/nested-workflows/)
- [Runtime/Dynamic Variables](/docs/workflows-legacy/runtime-variables/)

Workflows in Mastra help you orchestrate complex sequences of operations with features like branching, parallel execution, resource suspension, and more.

## When to use workflows

Most AI applications need more than a single call to a language model. You may want to run multiple steps, conditionally skip certain paths, or even pause execution altogether until you receive user input. Sometimes your agent tool calling is not accurate enough.

Mastra's workflow system provides:

- A standardized way to define steps and link them together.
- Support for both simple (linear) and advanced (branching, parallel) paths.
- Debugging and observability features to track each workflow run.

## Example

To create a workflow, you define one or more steps, link them, and then commit the workflow before starting it.

### Breaking Down the Workflow (Legacy)

Let's examine each part of the workflow creation process:

#### 1. Creating the Workflow

Here's how you define a workflow in Mastra. The `name` field determines the workflow's API endpoint (`/workflows/$NAME/`), while the `triggerSchema` defines the structure of the workflow's trigger data:

```ts filename="src/mastra/workflow/index.ts"
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";

const myWorkflow = new LegacyWorkflow({
  name: "my-workflow",
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});
```

#### 2. Defining Steps

Now, we'll define the workflow's steps. Each step can have its own input and output schemas. Here, `stepOne` doubles an input value, and `stepTwo` increments that result if `stepOne` was successful. (To keep things simple, we aren't making any LLM calls in this example):

```ts filename="src/mastra/workflow/index.ts"
const stepOne = new LegacyStep({
  id: "stepOne",
  outputSchema: z.object({
    doubledValue: z.number(),
  }),
  execute: async ({ context }) => {
    const doubledValue = context.triggerData.inputValue * 2;
    return { doubledValue };
  },
});

const stepTwo = new LegacyStep({
  id: "stepTwo",
  execute: async ({ context }) => {
    const doubledValue = context.getStepResult(stepOne)?.doubledValue;
    if (!doubledValue) {
      return { incrementedValue: 0 };
    }
    return {
      incrementedValue: doubledValue + 1,
    };
  },
});
```

#### 3. Linking Steps

Now, let's create the control flow, and "commit" (finalize the workflow). In this case, `stepOne` runs first and is followed by `stepTwo`.

```ts filename="src/mastra/workflow/index.ts"
myWorkflow.step(stepOne).then(stepTwo).commit();
```

### Register the Workflow

Register your workflow with Mastra to enable logging and telemetry:

```ts showLineNumbers filename="src/mastra/index.ts"
import { Mastra } from "@mastra/core";

export const mastra = new Mastra({
  legacy_workflows: { myWorkflow },
});
```

The workflow can also have the mastra instance injected into the context in the case where you need to create dynamic workflows:

```ts filename="src/mastra/workflow/index.ts"
import { Mastra } from "@mastra/core";
import { LegacyWorkflow } from "@mastra/core/workflows/legacy";

const mastra = new Mastra();

const myWorkflow = new LegacyWorkflow({
  name: "my-workflow",
  mastra,
});
```

### Executing the Workflow

Execute your workflow programmatically or via API:

```ts showLineNumbers filename="src/mastra/run-workflow.ts" copy
import { mastra } from "./index";

// Get the workflow
const myWorkflow = mastra.legacy_getWorkflow("myWorkflow");
const { runId, start } = myWorkflow.createRun();

// Start the workflow execution
await start({ triggerData: { inputValue: 45 } });
```

Or use the API (requires running `mastra dev`):

// Create workflow run

```bash
curl --location 'http://localhost:5000/api/workflows/myWorkflow/start-async' \
     --header 'Content-Type: application/json' \
     --data '{
       "inputValue": 45
     }'
```

This example shows the essentials: define your workflow, add steps, commit the workflow, then execute it.

## Defining Steps

The basic building block of a workflow [is a step](./steps.mdx). Steps are defined using schemas for inputs and outputs, and can fetch prior step results.

## Control Flow

Workflows let you define a [control flow](./control-flow.mdx) to chain steps together in with parallel steps, branching paths, and more.

## Workflow Variables

When you need to map data between steps or create dynamic data flows, [workflow variables](./variables.mdx) provide a powerful mechanism for passing information from one step to another and accessing nested properties within step outputs.

## Suspend and Resume

When you need to pause execution for external data, user input, or asynchronous events, Mastra [supports suspension at any step](./suspend-and-resume.mdx), persisting the state of the workflow so you can resume it later.

## Observability and Debugging

Mastra workflows automatically [log the input and output of each step within a workflow run](../../reference/observability/otel-config.mdx), allowing you to send this data to your preferred logging, telemetry, or observability tools.

You can:

- Track the status of each step (e.g., `success`, `error`, or `suspended`).
- Store run-specific metadata for analysis.
- Integrate with third-party observability platforms like Datadog or New Relic by forwarding logs.

## More Resources

- [Sequential Steps workflow example](../../examples/workflows_legacy/sequential-steps.mdx)
- [Parallel Steps workflow example](../../examples/workflows_legacy/parallel-steps.mdx)
- [Branching Paths workflow example](../../examples/workflows_legacy/branching-paths.mdx)
- [Workflow Variables example](../../examples/workflows_legacy/workflow-variables.mdx)
- [Cyclical Dependencies workflow example](../../examples/workflows_legacy/cyclical-dependencies.mdx)
- [Suspend and Resume workflow example](../../examples/workflows_legacy/suspend-and-resume.mdx)


---
title: "Runtime variables - dependency injection | Workflows (Legacy) | Mastra Docs"
description: Learn how to use Mastra's dependency injection system to provide runtime configuration to workflows and steps.
---

# Workflow Runtime Variables (Legacy)
[EN] Source: https://mastra.ai/en/docs/workflows-legacy/runtime-variables

Mastra provides a powerful dependency injection system that enables you to configure your workflows and steps with runtime variables. This feature is essential for creating flexible and reusable workflows that can adapt their behavior based on runtime configuration.

## Overview

The dependency injection system allows you to:

1. Pass runtime configuration variables to workflows through a type-safe runtimeContext
2. Access these variables within step execution contexts
3. Modify workflow behavior without changing the underlying code
4. Share configuration across multiple steps within the same workflow

## Basic Usage

```typescript
const myWorkflow = mastra.legacy_getWorkflow("myWorkflow");
const { runId, start, resume } = myWorkflow.createRun();

// Define your runtimeContext's type structure
type WorkflowRuntimeContext = {
  multiplier: number;
};

const runtimeContext = new RuntimeContext<WorkflowRuntimeContext>();
runtimeContext.set("multiplier", 5);

// Start the workflow execution with runtimeContext
await start({
  triggerData: { inputValue: 45 },
  runtimeContext,
});
```

## Using with REST API

Here's how to dynamically set a multiplier value from an HTTP header:

```typescript filename="src/index.ts"
import { Mastra } from "@mastra/core";
import { RuntimeContext } from "@mastra/core/di";
import { workflow as myWorkflow } from "./workflows";

// Define runtimeContext type with clear, descriptive types
type WorkflowRuntimeContext = {
  multiplier: number;
};

export const mastra = new Mastra({
  legacy_workflows: {
    myWorkflow,
  },
  server: {
    middleware: [
      async (c, next) => {
        const multiplier = c.req.header("x-multiplier");
        const runtimeContext = c.get<WorkflowRuntimeContext>("runtimeContext");

        // Parse and validate the multiplier value
        const multiplierValue = parseInt(multiplier || "1", 10);
        if (isNaN(multiplierValue)) {
          throw new Error("Invalid multiplier value");
        }

        runtimeContext.set("multiplier", multiplierValue);

        await next(); // Don't forget to call next()
      },
    ],
  },
});
```

## Creating Steps with Variables

Steps can access runtimeContext variables and must conform to the workflow's runtimeContext type:

```typescript
import { LegacyStep } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Define step input/output types
interface StepInput {
  inputValue: number;
}

interface StepOutput {
  incrementedValue: number;
}

const stepOne = new LegacyStep({
  id: "stepOne",
  description: "Multiply the input value by the configured multiplier",
  execute: async ({ context, runtimeContext }) => {
    try {
      // Type-safe access to runtimeContext variables
      const multiplier = runtimeContext.get("multiplier");
      if (multiplier === undefined) {
        throw new Error("Multiplier not configured in runtimeContext");
      }

      // Get and validate input
      const inputValue =
        context.getStepResult<StepInput>("trigger")?.inputValue;
      if (inputValue === undefined) {
        throw new Error("Input value not provided");
      }

      const result: StepOutput = {
        incrementedValue: inputValue * multiplier,
      };

      return result;
    } catch (error) {
      console.error(`Error in stepOne: ${error.message}`);
      throw error;
    }
  },
});
```

## Error Handling

When working with runtime variables in workflows, it's important to handle potential errors:

1. **Missing Variables**: Always check if required variables exist in the runtimeContext
2. **Type Mismatches**: Use TypeScript's type system to catch type errors at compile time
3. **Invalid Values**: Validate variable values before using them in your steps

```typescript
// Example of defensive programming with runtimeContext variables
const multiplier = runtimeContext.get("multiplier");
if (multiplier === undefined) {
  throw new Error("Multiplier not configured in runtimeContext");
}

// Type and value validation
if (typeof multiplier !== "number" || multiplier <= 0) {
  throw new Error(`Invalid multiplier value: ${multiplier}`);
}
```

## Best Practices

1. **Type Safety**: Always define proper types for your runtimeContext and step inputs/outputs
2. **Validation**: Validate all inputs and runtimeContext variables before using them
3. **Error Handling**: Implement proper error handling in your steps
4. **Documentation**: Document the expected runtimeContext variables for each workflow
5. **Default Values**: Provide sensible defaults when possible


---
title: "Creating Steps and Adding to Workflows (Legacy) | Mastra Docs"
description: "Steps in Mastra workflows provide a structured way to manage operations by defining inputs, outputs, and execution logic."
---

# Defining Steps in a Workflow (Legacy)
[EN] Source: https://mastra.ai/en/docs/workflows-legacy/steps

When you build a workflow, you typically break down operations into smaller tasks that can be linked and reused. Steps provide a structured way to manage these tasks by defining inputs, outputs, and execution logic.

The code below shows how to define these steps inline or separately.

## Inline Step Creation

You can create steps directly within your workflow using `.step()` and `.then()`. This code shows how to define, link, and execute two steps in sequence.

```typescript showLineNumbers filename="src/mastra/workflows/index.ts" copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

export const myWorkflow = new LegacyWorkflow({
  name: "my-workflow",
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});

myWorkflow
  .step(
    new LegacyStep({
      id: "stepOne",
      outputSchema: z.object({
        doubledValue: z.number(),
      }),
      execute: async ({ context }) => ({
        doubledValue: context.triggerData.inputValue * 2,
      }),
    }),
  )
  .then(
    new LegacyStep({
      id: "stepTwo",
      outputSchema: z.object({
        incrementedValue: z.number(),
      }),
      execute: async ({ context }) => {
        if (context.steps.stepOne.status !== "success") {
          return { incrementedValue: 0 };
        }

        return {
          incrementedValue: context.steps.stepOne.output.doubledValue + 1,
        };
      },
    }),
  )
  .commit();

// Register the workflow with Mastra
export const mastra = new Mastra({
  legacy_workflows: { myWorkflow },
});
```

## Creating Steps Separately

If you prefer to manage your step logic in separate entities, you can define steps outside and then add them to your workflow. This code shows how to define steps independently and link them afterward.

```typescript showLineNumbers filename="src/mastra/workflows/index.ts" copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Define steps separately
const stepOne = new LegacyStep({
  id: "stepOne",
  outputSchema: z.object({
    doubledValue: z.number(),
  }),
  execute: async ({ context }) => ({
    doubledValue: context.triggerData.inputValue * 2,
  }),
});

const stepTwo = new LegacyStep({
  id: "stepTwo",
  outputSchema: z.object({
    incrementedValue: z.number(),
  }),
  execute: async ({ context }) => {
    if (context.steps.stepOne.status !== "success") {
      return { incrementedValue: 0 };
    }
    return { incrementedValue: context.steps.stepOne.output.doubledValue + 1 };
  },
});

// Build the workflow
const myWorkflow = new LegacyWorkflow({
  name: "my-workflow",
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});

myWorkflow.step(stepOne).then(stepTwo);
myWorkflow.commit();

// Register the workflow with Mastra
export const mastra = new Mastra({
  legacy_workflows: { myWorkflow },
});
```


---
title: "Suspend & Resume Workflows (Legacy) | Human-in-the-Loop | Mastra Docs"
description: "Suspend and resume in Mastra workflows allows you to pause execution while waiting for external input or resources."
---

# Suspend and Resume in Workflows (Legacy)
[EN] Source: https://mastra.ai/en/docs/workflows-legacy/suspend-and-resume

Complex workflows often need to pause execution while waiting for external input or resources.

Mastra's suspend and resume features let you pause workflow execution at any step, persist the workflow snapshot to storage, and resume execution from the saved snapshot when ready.
This entire process is automatically managed by Mastra. No config needed, or manual step required from the user.

Storing the workflow snapshot to storage (LibSQL by default) means that the workflow state is permanently preserved across sessions, deployments, and server restarts. This persistence is crucial for workflows that might remain suspended for minutes, hours, or even days while waiting for external input or resources.

## When to Use Suspend/Resume

Common scenarios for suspending workflows include:

- Waiting for human approval or input
- Pausing until external API resources become available
- Collecting additional data needed for later steps
- Rate limiting or throttling expensive operations
- Handling event-driven processes with external triggers

## Basic Suspend Example

Here's a simple workflow that suspends when a value is too low and resumes when given a higher value:

```typescript
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";

const stepTwo = new LegacyStep({
  id: "stepTwo",
  outputSchema: z.object({
    incrementedValue: z.number(),
  }),
  execute: async ({ context, suspend }) => {
    if (context.steps.stepOne.status !== "success") {
      return { incrementedValue: 0 };
    }

    const currentValue = context.steps.stepOne.output.doubledValue;

    if (currentValue < 100) {
      await suspend();
      return { incrementedValue: 0 };
    }
    return { incrementedValue: currentValue + 1 };
  },
});
```

## Async/Await Based Flow

The suspend and resume mechanism in Mastra uses an async/await pattern that makes it intuitive to implement complex workflows with suspension points. The code structure naturally reflects the execution flow.

### How It Works

1. A step's execution function receives a `suspend` function in its parameters
2. When called with `await suspend()`, the workflow pauses at that point
3. The workflow state is persisted
4. Later, the workflow can be resumed by calling `workflow.resume()` with the appropriate parameters
5. Execution continues from the point after the `suspend()` call

### Example with Multiple Suspension Points

Here's an example of a workflow with multiple steps that can suspend:

```typescript
// Define steps with suspend capability
const promptAgentStep = new LegacyStep({
  id: "promptAgent",
  execute: async ({ context, suspend }) => {
    // Some condition that determines if we need to suspend
    if (needHumanInput) {
      // Optionally pass payload data that will be stored with suspended state
      await suspend({ requestReason: "Need human input for prompt" });
      // Code after suspend() will execute when the step is resumed
      return { modelOutput: context.userInput };
    }
    return { modelOutput: "AI generated output" };
  },
  outputSchema: z.object({ modelOutput: z.string() }),
});

const improveResponseStep = new LegacyStep({
  id: "improveResponse",
  execute: async ({ context, suspend }) => {
    // Another condition for suspension
    if (needFurtherRefinement) {
      await suspend();
      return { improvedOutput: context.refinedOutput };
    }
    return { improvedOutput: "Improved output" };
  },
  outputSchema: z.object({ improvedOutput: z.string() }),
});

// Build the workflow
const workflow = new LegacyWorkflow({
  name: "multi-suspend-workflow",
  triggerSchema: z.object({ input: z.string() }),
});

workflow
  .step(getUserInput)
  .then(promptAgentStep)
  .then(evaluateTone)
  .then(improveResponseStep)
  .then(evaluateImproved)
  .commit();

// Register the workflow with Mastra
export const mastra = new Mastra({
  legacy_workflows: { workflow },
});
```

### Starting and Resuming the Workflow

```typescript
// Get the workflow and create a run
const wf = mastra.legacy_getWorkflow("multi-suspend-workflow");
const run = wf.createRun();

// Start the workflow
const initialResult = await run.start({
  triggerData: { input: "initial input" },
});

let promptAgentStepResult = initialResult.activePaths.get("promptAgent");
let promptAgentResumeResult = undefined;

// Check if a step is suspended
if (promptAgentStepResult?.status === "suspended") {
  console.log("Workflow suspended at promptAgent step");

  // Resume the workflow with new context
  const resumeResult = await run.resume({
    stepId: "promptAgent",
    context: { userInput: "Human provided input" },
  });

  promptAgentResumeResult = resumeResult;
}

const improveResponseStepResult =
  promptAgentResumeResult?.activePaths.get("improveResponse");

if (improveResponseStepResult?.status === "suspended") {
  console.log("Workflow suspended at improveResponse step");

  // Resume again with different context
  const finalResult = await run.resume({
    stepId: "improveResponse",
    context: { refinedOutput: "Human refined output" },
  });

  console.log("Workflow completed:", finalResult?.results);
}
```

## Event-Based Suspension and Resumption

In addition to manually suspending steps, Mastra provides event-based suspension through the `afterEvent` method. This allows workflows to automatically suspend and wait for a specific event to occur before continuing.

### Using afterEvent and resumeWithEvent

The `afterEvent` method automatically creates a suspension point in your workflow that waits for a specific event to occur. When the event happens, you can use `resumeWithEvent` to continue the workflow with the event data.

Here's how it works:

1. Define events in your workflow configuration
2. Use `afterEvent` to create a suspension point waiting for that event
3. When the event occurs, call `resumeWithEvent` with the event name and data

### Example: Event-Based Workflow

```typescript
// Define steps
const getUserInput = new LegacyStep({
  id: "getUserInput",
  execute: async () => ({ userInput: "initial input" }),
  outputSchema: z.object({ userInput: z.string() }),
});

const processApproval = new LegacyStep({
  id: "processApproval",
  execute: async ({ context }) => {
    // Access the event data from the context
    const approvalData = context.inputData?.resumedEvent;
    return {
      approved: approvalData?.approved,
      approvedBy: approvalData?.approverName,
    };
  },
  outputSchema: z.object({
    approved: z.boolean(),
    approvedBy: z.string(),
  }),
});

// Create workflow with event definition
const approvalWorkflow = new LegacyWorkflow({
  name: "approval-workflow",
  triggerSchema: z.object({ requestId: z.string() }),
  events: {
    approvalReceived: {
      schema: z.object({
        approved: z.boolean(),
        approverName: z.string(),
      }),
    },
  },
});

// Build workflow with event-based suspension
approvalWorkflow
  .step(getUserInput)
  .afterEvent("approvalReceived") // Workflow will automatically suspend here
  .step(processApproval) // This step runs after the event is received
  .commit();
```

### Running an Event-Based Workflow

```typescript
// Get the workflow
const workflow = mastra.legacy_getWorkflow("approval-workflow");
const run = workflow.createRun();

// Start the workflow
const initialResult = await run.start({
  triggerData: { requestId: "request-123" },
});

console.log("Workflow started, waiting for approval event");
console.log(initialResult.results);
// Output will show the workflow is suspended at the event step:
// {
//   getUserInput: { status: 'success', output: { userInput: 'initial input' } },
//   __approvalReceived_event: { status: 'suspended' }
// }

// Later, when the approval event occurs:
const resumeResult = await run.resumeWithEvent("approvalReceived", {
  approved: true,
  approverName: "Jane Doe",
});

console.log("Workflow resumed with event data:", resumeResult.results);
// Output will show the completed workflow:
// {
//   getUserInput: { status: 'success', output: { userInput: 'initial input' } },
//   __approvalReceived_event: { status: 'success', output: { executed: true, resumedEvent: { approved: true, approverName: 'Jane Doe' } } },
//   processApproval: { status: 'success', output: { approved: true, approvedBy: 'Jane Doe' } }
// }
```

### Key Points About Event-Based Workflows

- The `suspend()` function can optionally take a payload object that will be stored with the suspended state
- Code after the `await suspend()` call will not execute until the step is resumed
- When a step is suspended, its status becomes `'suspended'` in the workflow results
- When resumed, the step's status changes from `'suspended'` to `'success'` once completed
- The `resume()` method requires the `stepId` to identify which suspended step to resume
- You can provide new context data when resuming that will be merged with existing step results

- Events must be defined in the workflow configuration with a schema
- The `afterEvent` method creates a special suspended step that waits for the event
- The event step is automatically named `__eventName_event` (e.g., `__approvalReceived_event`)
- Use `resumeWithEvent` to provide event data and continue the workflow
- Event data is validated against the schema defined for that event
- The event data is available in the context as `inputData.resumedEvent`

## Storage for Suspend and Resume

When a workflow is suspended using `await suspend()`, Mastra automatically persists the entire workflow state to storage. This is essential for workflows that might remain suspended for extended periods, as it ensures the state is preserved across application restarts or server instances.

### Default Storage: LibSQL

By default, Mastra uses LibSQL as its storage engine:

```typescript
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";

const mastra = new Mastra({
  storage: new LibSQLStore({
    url: "file:./storage.db", // Local file-based database for development
    // For production, use a persistent URL:
    // url: process.env.DATABASE_URL,
    // authToken: process.env.DATABASE_AUTH_TOKEN, // Optional for authenticated connections
  }),
});
```

The LibSQL storage can be configured in different modes:

- In-memory database (testing): `:memory:`
- File-based database (development): `file:storage.db`
- Remote database (production): URLs like `libsql://your-database.turso.io`

### Alternative Storage Options

#### Upstash (Redis-Compatible)

For serverless applications or environments where Redis is preferred:

```bash copy
npm install @mastra/upstash@latest
```

```typescript
import { Mastra } from "@mastra/core/mastra";
import { UpstashStore } from "@mastra/upstash";

const mastra = new Mastra({
  storage: new UpstashStore({
    url: process.env.UPSTASH_URL,
    token: process.env.UPSTASH_TOKEN,
  }),
});
```

### Storage Considerations

- All storage options support suspend and resume functionality identically
- The workflow state is automatically serialized and saved when suspended
- No additional configuration is needed for suspend/resume to work with storage
- Choose your storage option based on your infrastructure, scaling needs, and existing technology stack

## Watching and Resuming

To handle suspended workflows, use the `watch` method to monitor workflow status per run and `resume` to continue execution:

```typescript
import { mastra } from "./index";

// Get the workflow
const myWorkflow = mastra.legacy_getWorkflow("myWorkflow");
const { start, watch, resume } = myWorkflow.createRun();

// Start watching the workflow before executing it
watch(async ({ activePaths }) => {
  const isStepTwoSuspended = activePaths.get("stepTwo")?.status === "suspended";
  if (isStepTwoSuspended) {
    console.log("Workflow suspended, resuming with new value");

    // Resume the workflow with new context
    await resume({
      stepId: "stepTwo",
      context: { secondValue: 100 },
    });
  }
});

// Start the workflow execution
await start({ triggerData: { inputValue: 45 } });
```

### Watching and Resuming Event-Based Workflows

You can use the same watching pattern with event-based workflows:

```typescript
const { start, watch, resumeWithEvent } = workflow.createRun();

// Watch for suspended event steps
watch(async ({ activePaths }) => {
  const isApprovalReceivedSuspended =
    activePaths.get("__approvalReceived_event")?.status === "suspended";
  if (isApprovalReceivedSuspended) {
    console.log("Workflow waiting for approval event");

    // In a real scenario, you would wait for the actual event to occur
    // For example, this could be triggered by a webhook or user interaction
    setTimeout(async () => {
      await resumeWithEvent("approvalReceived", {
        approved: true,
        approverName: "Auto Approver",
      });
    }, 5000); // Simulate event after 5 seconds
  }
});

// Start the workflow
await start({ triggerData: { requestId: "auto-123" } });
```

## Further Reading

For a deeper understanding of how suspend and resume works under the hood:

- [Understanding Snapshots in Mastra Workflows](../../reference/legacyWorkflows/snapshots.mdx) - Learn about the snapshot mechanism that powers suspend and resume functionality
- [Step Configuration Guide](./steps.mdx) - Learn more about configuring steps in your workflows
- [Control Flow Guide](./control-flow.mdx) - Advanced workflow control patterns
- [Event-Driven Workflows](../../reference/legacyWorkflows/events.mdx) - Detailed reference for event-based workflows

## Related Resources

- See the [Suspend and Resume Example](../../examples/workflows_legacy/suspend-and-resume.mdx) for a complete working example
- Check the [Step Class Reference](../../reference/legacyWorkflows/step-class.mdx) for suspend/resume API details
- Review [Workflow Observability](../../reference/observability/otel-config.mdx) for monitoring suspended workflows


---
title: "Data Mapping with Workflow (Legacy) Variables | Mastra Docs"
description: "Learn how to use workflow variables to map data between steps and create dynamic data flows in your Mastra workflows."
---

# Data Mapping with Workflow Variables
[EN] Source: https://mastra.ai/en/docs/workflows-legacy/variables

Workflow variables in Mastra provide a powerful mechanism for mapping data between steps, allowing you to create dynamic data flows and pass information from one step to another.

## Understanding Workflow Variables

In Mastra workflows, variables serve as a way to:

- Map data from trigger inputs to step inputs
- Pass outputs from one step to inputs of another step
- Access nested properties within step outputs
- Create more flexible and reusable workflow steps

## Using Variables for Data Mapping

### Basic Variable Mapping

You can map data between steps using the `variables` property when adding a step to your workflow:

```typescript showLineNumbers filename="src/mastra/workflows/index.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";

const workflow = new LegacyWorkflow({
  name: "data-mapping-workflow",
  triggerSchema: z.object({
    inputData: z.string(),
  }),
});

workflow
  .step(step1, {
    variables: {
      // Map trigger data to step input
      inputData: { step: "trigger", path: "inputData" },
    },
  })
  .then(step2, {
    variables: {
      // Map output from step1 to input for step2
      previousValue: { step: step1, path: "outputField" },
    },
  })
  .commit();

// Register the workflow with Mastra
export const mastra = new Mastra({
  legacy_workflows: { workflow },
});
```

### Accessing Nested Properties

You can access nested properties using dot notation in the `path` field:

```typescript showLineNumbers filename="src/mastra/workflows/index.ts" copy
workflow
  .step(step1)
  .then(step2, {
    variables: {
      // Access a nested property from step1's output
      nestedValue: { step: step1, path: "nested.deeply.value" },
    },
  })
  .commit();
```

### Mapping Entire Objects

You can map an entire object by using `.` as the path:

```typescript showLineNumbers filename="src/mastra/workflows/index.ts" copy
workflow
  .step(step1, {
    variables: {
      // Map the entire trigger data object
      triggerData: { step: "trigger", path: "." },
    },
  })
  .commit();
```

### Variables in Loops

Variables can also be passed to `while` and `until` loops. This is useful for passing data between iterations or from outside steps:

```typescript showLineNumbers filename="src/mastra/workflows/loop-variables.ts" copy
// Step that increments a counter
const incrementStep = new LegacyStep({
  id: "increment",
  inputSchema: z.object({
    // Previous value from last iteration
    prevValue: z.number().optional(),
  }),
  outputSchema: z.object({
    // Updated counter value
    updatedCounter: z.number(),
  }),
  execute: async ({ context }) => {
    const { prevValue = 0 } = context.inputData;
    return { updatedCounter: prevValue + 1 };
  },
});

const workflow = new LegacyWorkflow({
  name: "counter",
});

workflow.step(incrementStep).while(
  async ({ context }) => {
    // Continue while counter is less than 10
    const result = context.getStepResult(incrementStep);
    return (result?.updatedCounter ?? 0) < 10;
  },
  incrementStep,
  {
    // Pass previous value to next iteration
    prevValue: {
      step: incrementStep,
      path: "updatedCounter",
    },
  },
);
```

## Variable Resolution

When a workflow executes, Mastra resolves variables at runtime by:

1. Identifying the source step specified in the `step` property
2. Retrieving the output from that step
3. Navigating to the specified property using the `path`
4. Injecting the resolved value into the target step's context as the `inputData` property

## Examples

### Mapping from Trigger Data

This example shows how to map data from the workflow trigger to a step:

```typescript showLineNumbers filename="src/mastra/workflows/trigger-mapping.ts" copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Define a step that needs user input
const processUserInput = new LegacyStep({
  id: "processUserInput",
  execute: async ({ context }) => {
    // The inputData will be available in context because of the variable mapping
    const { inputData } = context.inputData;

    return {
      processedData: `Processed: ${inputData}`,
    };
  },
});

// Create the workflow
const workflow = new LegacyWorkflow({
  name: "trigger-mapping",
  triggerSchema: z.object({
    inputData: z.string(),
  }),
});

// Map the trigger data to the step
workflow
  .step(processUserInput, {
    variables: {
      inputData: { step: "trigger", path: "inputData" },
    },
  })
  .commit();

// Register the workflow with Mastra
export const mastra = new Mastra({
  legacy_workflows: { workflow },
});
```

### Mapping Between Steps

This example demonstrates mapping data from one step to another:

```typescript showLineNumbers filename="src/mastra/workflows/step-mapping.ts" copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Step 1: Generate data
const generateData = new LegacyStep({
  id: "generateData",
  outputSchema: z.object({
    nested: z.object({
      value: z.string(),
    }),
  }),
  execute: async () => {
    return {
      nested: {
        value: "step1-data",
      },
    };
  },
});

// Step 2: Process the data from step 1
const processData = new LegacyStep({
  id: "processData",
  inputSchema: z.object({
    previousValue: z.string(),
  }),
  execute: async ({ context }) => {
    // previousValue will be available because of the variable mapping
    const { previousValue } = context.inputData;

    return {
      result: `Processed: ${previousValue}`,
    };
  },
});

// Create the workflow
const workflow = new LegacyWorkflow({
  name: "step-mapping",
});

// Map data from step1 to step2
workflow
  .step(generateData)
  .then(processData, {
    variables: {
      // Map the nested.value property from generateData's output
      previousValue: { step: generateData, path: "nested.value" },
    },
  })
  .commit();

// Register the workflow with Mastra
export const mastra = new Mastra({
  legacy_workflows: { workflow },
});
```

## Type Safety

Mastra provides type safety for variable mappings when using TypeScript:

```typescript showLineNumbers filename="src/mastra/workflows/type-safe.ts" copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Define schemas for better type safety
const triggerSchema = z.object({
  inputValue: z.string(),
});

type TriggerType = z.infer<typeof triggerSchema>;

// Step with typed context
const step1 = new LegacyStep({
  id: "step1",
  outputSchema: z.object({
    nested: z.object({
      value: z.string(),
    }),
  }),
  execute: async ({ context }) => {
    // TypeScript knows the shape of triggerData
    const triggerData = context.getStepResult<TriggerType>("trigger");

    return {
      nested: {
        value: `processed-${triggerData?.inputValue}`,
      },
    };
  },
});

// Create the workflow with the schema
const workflow = new LegacyWorkflow({
  name: "type-safe-workflow",
  triggerSchema,
});

workflow.step(step1).commit();

// Register the workflow with Mastra
export const mastra = new Mastra({
  legacy_workflows: { workflow },
});
```

## Best Practices

1. **Validate Inputs and Outputs**: Use `inputSchema` and `outputSchema` to ensure data consistency.

2. **Keep Mappings Simple**: Avoid overly complex nested paths when possible.

3. **Consider Default Values**: Handle cases where mapped data might be undefined.

## Comparison with Direct Context Access

While you can access previous step results directly via `context.steps`, using variable mappings offers several advantages:

| Feature     | Variable Mapping                            | Direct Context Access           |
| ----------- | ------------------------------------------- | ------------------------------- |
| Clarity     | Explicit data dependencies                  | Implicit dependencies           |
| Reusability | Steps can be reused with different mappings | Steps are tightly coupled       |
| Type Safety | Better TypeScript integration               | Requires manual type assertions |


---
title: "Example: Categorizing Birds | Agents | Mastra Docs"
description: Example of using a Mastra AI Agent to determine if an image from Unsplash depicts a bird.
---

import { GithubLink } from "@/components/github-link";

# Example: Categorizing Birds with an AI Agent
[EN] Source: https://mastra.ai/en/examples/agents/bird-checker

We will get a random image from [Unsplash](https://unsplash.com/) that matches a selected query and uses a [Mastra AI Agent](/docs/agents/overview.md) to determine if it is a bird or not.

```ts showLineNumbers copy
import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";

export type Image = {
  alt_description: string;
  urls: {
    regular: string;
    raw: string;
  };
  user: {
    first_name: string;
    links: {
      html: string;
    };
  };
};

export type ImageResponse<T, K> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: K;
    };

const getRandomImage = async ({
  query,
}: {
  query: string;
}): Promise<ImageResponse<Image, string>> => {
  const page = Math.floor(Math.random() * 20);
  const order_by = Math.random() < 0.5 ? "relevant" : "latest";
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${query}&page=${page}&order_by=${order_by}`,
      {
        method: "GET",
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          "Accept-Version": "v1",
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return {
        ok: false,
        error: "Failed to fetch image",
      };
    }

    const data = (await res.json()) as {
      results: Array<Image>;
    };
    const randomNo = Math.floor(Math.random() * data.results.length);

    return {
      ok: true,
      data: data.results[randomNo] as Image,
    };
  } catch (err) {
    return {
      ok: false,
      error: "Error fetching image",
    };
  }
};

const instructions = `
  You can view an image and figure out if it is a bird or not. 
  You can also figure out the species of the bird and where the picture was taken.
`;

export const birdCheckerAgent = new Agent({
  name: "Bird checker",
  instructions,
  model: anthropic("claude-3-haiku-20240307"),
});

const queries: string[] = ["wildlife", "feathers", "flying", "birds"];
const randomQuery = queries[Math.floor(Math.random() * queries.length)];

// Get the image url from Unsplash with random type
const imageResponse = await getRandomImage({ query: randomQuery });

if (!imageResponse.ok) {
  console.log("Error fetching image", imageResponse.error);
  process.exit(1);
}

console.log("Image URL: ", imageResponse.data.urls.regular);
const response = await birdCheckerAgent.generate(
  [
    {
      role: "user",
      content: [
        {
          type: "image",
          image: new URL(imageResponse.data.urls.regular),
        },
        {
          type: "text",
          text: "view this image and let me know if it's a bird or not, and the scientific name of the bird without any explanation. Also summarize the location for this picture in one or two short sentences understandable by a high school student",
        },
      ],
    },
  ],
  {
    output: z.object({
      bird: z.boolean(),
      species: z.string(),
      location: z.string(),
    }),
  },
);

console.log(response.object);
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />

<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/agents/bird-checker"
  }
/>


---
title: "Example: Deploying an MCPServer | Agents | Mastra Docs"
description: Example of setting up, building, and deploying a Mastra MCPServer using the stdio transport and publishing it to NPM.
---

import { GithubLink } from "@/components/github-link";

# Dynamic Agents Example
[EN] Source: https://mastra.ai/en/examples/agents/dynamic-agents

First, let's define our runtime context type:

```typescript
import { Agent, RuntimeContext } from "@mastra/core";
import { z } from "zod";

type SupportRuntimeContext = {
  "user-tier": "free" | "pro" | "enterprise";
  language: "en" | "es" | "fr";
  "user-id": string;
};
```

Next, let's create our dynamic support agent with its configuration:

```typescript
const supportAgent = new Agent({
  name: "Dynamic Support Agent",

  instructions: async ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    const language = runtimeContext.get("language");

    return `You are a customer support agent for our SaaS platform.
    The current user is on the ${userTier} tier and prefers ${language} language.
    
    For ${userTier} tier users:
    ${userTier === "free" ? "- Provide basic support and documentation links" : ""}
    ${userTier === "pro" ? "- Offer detailed technical support and best practices" : ""}
    ${userTier === "enterprise" ? "- Provide priority support with custom solutions" : ""}
    
    Always respond in ${language} language.`;
  },

  model: ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    return userTier === "enterprise"
      ? openai("gpt-4")
      : openai("gpt-3.5-turbo");
  },

  tools: ({ runtimeContext }) => {
    const userTier = runtimeContext.get("user-tier");
    const baseTools = [knowledgeBase, ticketSystem];

    if (userTier === "pro" || userTier === "enterprise") {
      baseTools.push(advancedAnalytics);
    }

    if (userTier === "enterprise") {
      baseTools.push(customIntegration);
    }

    return baseTools;
  },
});
```

RuntimeContext can be passed from the client/server directly to your agent generate and stream calls

```typescript
async function handleSupportRequest(userId: string, message: string) {
  const runtimeContext = new RuntimeContext<SupportRuntimeContext>();

  runtimeContext.set("user-id", userId);
  runtimeContext.set("user-tier", await getUserTier(userId));
  runtimeContext.set("language", await getUserLanguage(userId));

  const response = await supportAgent.generate(message, {
    runtimeContext,
  });

  return response.text;
}
```

RuntimeContext can also be set from the server middleware layer

```typescript
import { Mastra } from "@mastra/core";
import { registerApiRoute } from "@mastra/core/server";

export const mastra = new Mastra({
  agents: {
    support: supportAgent,
  },
  server: {
    middleware: [
      async (c, next) => {
        const userId = c.req.header("X-User-ID");
        const runtimeContext = c.get<SupportRuntimeContext>("runtimeContext");

        // Set user tier based on subscription
        const userTier = await getUserTier(userId);
        runtimeContext.set("user-tier", userTier);

        // Set language based on user preferences
        const language = await getUserLanguage(userId);
        runtimeContext.set("language", language);

        // Set user ID
        runtimeContext.set("user-id", userId);

        await next();
      },
    ],
    apiRoutes: [
      registerApiRoute("/support", {
        method: "POST",
        handler: async (c) => {
          const { userId, message } = await c.req.json();

          try {
            const response = await handleSupportRequest(userId, message);
            return c.json({ response });
          } catch (error) {
            return c.json({ error: "Failed to process support request" }, 500);
          }
        },
      }),
    ],
  },
});
```

## Usage Example

This example shows how a single agent can handle different types of users and scenarios by leveraging runtime context, making it more flexible and maintainable than creating separate agents for each use case.


---
title: "Example: Hierarchical Multi-Agent System | Agents | Mastra"
description: Example of creating a hierarchical multi-agent system using Mastra, where agents interact through tool functions.
---

import { GithubLink } from "@/components/github-link";

# Hierarchical Multi-Agent System
[EN] Source: https://mastra.ai/en/examples/agents/hierarchical-multi-agent

This example demonstrates how to create a hierarchical multi-agent system where agents interact through tool functions, with one agent coordinating the work of others.

The system consists of three agents:

1. A Publisher agent (supervisor) that orchestrates the process
2. A Copywriter agent that writes the initial content
3. An Editor agent that refines the content

First, define the Copywriter agent and its tool:

```ts showLineNumbers copy
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

const copywriterAgent = new Agent({
  name: "Copywriter",
  instructions: "You are a copywriter agent that writes blog post copy.",
  model: anthropic("claude-3-5-sonnet-20241022"),
});

const copywriterTool = createTool({
  id: "copywriter-agent",
  description: "Calls the copywriter agent to write blog post copy.",
  inputSchema: z.object({
    topic: z.string().describe("Blog post topic"),
  }),
  outputSchema: z.object({
    copy: z.string().describe("Blog post copy"),
  }),
  execute: async ({ context }) => {
    const result = await copywriterAgent.generate(
      `Create a blog post about ${context.topic}`,
    );
    return { copy: result.text };
  },
});
```

Next, define the Editor agent and its tool:

```ts showLineNumbers copy
const editorAgent = new Agent({
  name: "Editor",
  instructions: "You are an editor agent that edits blog post copy.",
  model: openai("gpt-4o-mini"),
});

const editorTool = createTool({
  id: "editor-agent",
  description: "Calls the editor agent to edit blog post copy.",
  inputSchema: z.object({
    copy: z.string().describe("Blog post copy"),
  }),
  outputSchema: z.object({
    copy: z.string().describe("Edited blog post copy"),
  }),
  execute: async ({ context }) => {
    const result = await editorAgent.generate(
      `Edit the following blog post only returning the edited copy: ${context.copy}`,
    );
    return { copy: result.text };
  },
});
```

Finally, create the Publisher agent that coordinates the others:

```ts showLineNumbers copy
const publisherAgent = new Agent({
  name: "publisherAgent",
  instructions:
    "You are a publisher agent that first calls the copywriter agent to write blog post copy about a specific topic and then calls the editor agent to edit the copy. Just return the final edited copy.",
  model: anthropic("claude-3-5-sonnet-20241022"),
  tools: { copywriterTool, editorTool },
});

const mastra = new Mastra({
  agents: { publisherAgent },
});
```

To use the entire system:

```ts showLineNumbers copy
async function main() {
  const agent = mastra.getAgent("publisherAgent");
  const result = await agent.generate(
    "Write a blog post about React JavaScript frameworks. Only return the final edited copy.",
  );
  console.log(result.text);
}

main();
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />

<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/agents/hierarchical-multi-agent"
  }
/>


---
title: "Example: Multi-Agent Workflow | Agents | Mastra Docs"
description: Example of creating an agentic workflow in Mastra, where work product is passed between multiple agents.
---

import { GithubLink } from "@/components/github-link";

# Multi-Agent Workflow
[EN] Source: https://mastra.ai/en/examples/agents/multi-agent-workflow

This example demonstrates how to create an agentic workflow with work product being passed between multiple agents with a worker agent and a supervisor agent.

In this example, we create a sequential workflow that calls two agents in order:

1. A Copywriter agent that writes the initial blog post
2. An Editor agent that refines the content

First, import the required dependencies:

```typescript
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { Agent } from "@mastra/core/agent";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
```

Create the copywriter agent that will generate the initial blog post:

```typescript
const copywriterAgent = new Agent({
  name: "Copywriter",
  instructions: "You are a copywriter agent that writes blog post copy.",
  model: anthropic("claude-3-5-sonnet-20241022"),
});
```

Define the copywriter step that executes the agent and handles the response:

```typescript
const copywriterStep = createStep({
  id: "copywriterStep",
  inputSchema: z.object({
    topic: z.string(),
  }),
  outputSchema: z.object({
    copy: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData?.topic) {
      throw new Error("Topic not found in trigger data");
    }
    const result = await copywriterAgent.generate(
      `Create a blog post about ${inputData.topic}`,
    );
    console.log("copywriter result", result.text);
    return {
      copy: result.text,
    };
  },
});
```

Set up the editor agent to refine the copywriter's content:

```typescript
const editorAgent = new Agent({
  name: "Editor",
  instructions: "You are an editor agent that edits blog post copy.",
  model: openai("gpt-4o-mini"),
});
```

Create the editor step that processes the copywriter's output:

```typescript
const editorStep = createStep({
  id: "editorStep",
  inputSchema: z.object({
    copy: z.string(),
  }),
  outputSchema: z.object({
    finalCopy: z.string(),
  }),
  execute: async ({ inputData }) => {
    const copy = inputData?.copy;

    const result = await editorAgent.generate(
      `Edit the following blog post only returning the edited copy: ${copy}`,
    );
    console.log("editor result", result.text);
    return {
      finalCopy: result.text,
    };
  },
});
```

Configure the workflow and execute the steps:

```typescript
const myWorkflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({
    topic: z.string(),
  }),
  outputSchema: z.object({
    finalCopy: z.string(),
  }),
});

// Run steps sequentially.
myWorkflow.then(copywriterStep).then(editorStep).commit();

const run = await myWorkflow.createRunAsync();

const res = await run.start({
  inputData: { topic: "React JavaScript frameworks" },
});
console.log("Response: ", res);
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />

<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/agents/multi-agent-workflow"
  }
/>


---
title: "Example: Agents with a System Prompt | Agents | Mastra Docs"
description: Example of creating an AI agent in Mastra with a system prompt to define its personality and capabilities.
---

import { GithubLink } from "@/components/github-link";

# Giving an Agent a System Prompt
[EN] Source: https://mastra.ai/en/examples/agents/system-prompt

When building AI agents, you often need to give them specific instructions and capabilities to handle specialized tasks effectively. System prompts allow you to define an agent's personality, knowledge domain, and behavioral guidelines. This example shows how to create an AI agent with custom instructions and integrate it with a dedicated tool for retrieving verified information.

```ts showLineNumbers copy
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";

import { z } from "zod";

const instructions = `You are a helpful cat expert assistant. When discussing cats, you should always include an interesting cat fact.

  Your main responsibilities:
  1. Answer questions about cats
  2. Use the catFact tool to provide verified cat facts
  3. Incorporate the cat facts naturally into your responses

  Always use the catFact tool at least once in your responses to ensure accuracy.`;

const getCatFact = async () => {
  const { fact } = (await fetch("https://catfact.ninja/fact").then((res) =>
    res.json(),
  )) as {
    fact: string;
  };

  return fact;
};

const catFact = createTool({
  id: "Get cat facts",
  inputSchema: z.object({}),
  description: "Fetches cat facts",
  execute: async () => {
    console.log("using tool to fetch cat fact");
    return {
      catFact: await getCatFact(),
    };
  },
});

const catOne = new Agent({
  name: "cat-one",
  instructions: instructions,
  model: openai("gpt-4o-mini"),
  tools: {
    catFact,
  },
});

const result = await catOne.generate("Tell me a cat fact");

console.log(result.text);
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />

<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/agents/system-prompt"
  }
/>


---
title: "Example: Giving an Agent a Tool | Agents | Mastra Docs"
description: Example of creating an AI agent in Mastra that uses a dedicated tool to provide weather information.
---

import { GithubLink } from "@/components/github-link";

# Example: Giving an Agent a Tool
[EN] Source: https://mastra.ai/en/examples/agents/using-a-tool

When building AI agents, you often need to integrate external data sources or functionality to enhance their capabilities. This example shows how to create an AI agent that uses a dedicated weather tool to provide accurate weather information for specific locations.

```ts showLineNumbers copy
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data: WeatherResponse = await response.json();

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return conditions[code] || "Unknown";
}

const weatherAgent = new Agent({
  name: "Weather Agent",
  instructions: `You are a helpful weather assistant that provides accurate weather information.
Your primary function is to help users get weather details for specific locations. When responding:
- Always ask for a location if none is provided
- If the location name isn’t in English, please translate it
- Include relevant details like humidity, wind conditions, and precipitation
- Keep responses concise but informative
Use the weatherTool to fetch current weather data.`,
  model: openai("gpt-4o-mini"),
  tools: { weatherTool },
});

const mastra = new Mastra({
  agents: { weatherAgent },
});

async function main() {
  const agent = await mastra.getAgent("weatherAgent");
  const result = await agent.generate("What is the weather in London?");
  console.log(result.text);
}

main();
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />

<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/agents/using-a-tool"
  }
/>


---
title: "Example: Workflow as Tools | Agents | Mastra Docs"
description: Example of creating Agents in Mastra, demonstrating how to use workflows as tools. It shows how to suspend and resume workflows from an agent.
---

import { GithubLink } from "@/components/github-link";

# Workflow as Tools
[EN] Source: https://mastra.ai/en/examples/agents/workflow-as-tools

When building AI applications, you often need to coordinate multiple steps that depend on each other's outputs. This example shows how to create an AI workflow that fetches weather data from a workflow. It also demonstrates how to handle suspend and resume of workflows from an agent.

### Workflow Definition

```ts showLineNumbers copy
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { createTool } from '@mastra/core/tools';
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string(),
});

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    95: 'Thunderstorm',
  };
  return conditions[code] || 'Unknown';
}

const fetchWeatherWithSuspend = createStep({
  id: 'fetch-weather',
  description: 'Fetches weather forecast for a given city',
  inputSchema: z.object({}),
  resumeSchema: z.object({
    city: z.string().describe('The city to get the weather for'),
  }),
  outputSchema: forecastSchema,
  execute: async ({ resumeData, suspend }) => {
    if (!resumeData) {
      suspend({
        message: 'Please enter the city to get the weather for',
      });

      return {};
    }

    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(resumeData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results: { latitude: number; longitude: number; name: string }[];
    };

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${resumeData.city}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      current: {
        time: string;
        precipitation: number;
        weathercode: number;
      };
      hourly: {
        precipitation_probability: number[];
        temperature_2m: number[];
      };
    };

    const forecast = {
      date: new Date().toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition(data.current.weathercode),
      precipitationChance: data.hourly.precipitation_probability.reduce((acc, curr) => Math.max(acc, curr), 0),
      location: resumeData.city,
    };

    return forecast;
  },
});

const weatherWorkflowWithSuspend = createWorkflow({
  id: 'weather-workflow-with-suspend',
  inputSchema: z.object({}),
  outputSchema: forecastSchema,
})
  .then(fetchWeatherWithSuspend)
  .commit();
```

### Tool Definitions

```ts
export const startWeatherTool = createTool({
  id: 'start-weather-tool',
  description: 'Start the weather tool',
  inputSchema: z.object({}),
  outputSchema: z.object({
    runId: z.string(),
  }),
  execute: async ({ context }) => {
    const workflow = mastra.getWorkflow('weatherWorkflowWithSuspend');
    const run = await workflow.createRunAsync();
    await run.start({
      inputData: {},
    });

    return {
      runId: run.runId,
    };
  },
});

export const resumeWeatherTool = createTool({
  id: 'resume-weather-tool',
  description: 'Resume the weather tool',
  inputSchema: z.object({
    runId: z.string(),
    city: z.string().describe('City name'),
  }),
  outputSchema: forecastSchema,
  execute: async ({ context }) => {
    const workflow = mastra.getWorkflow('weatherWorkflowWithSuspend');
    const run = await workflow.createRunAsync({
      runId: context.runId,
    });
    const result = await run.resume({
      step: 'fetch-weather',
      resumeData: {
        city: context.city,
      },
    });
    return result.result;
  },
});
```

### Agent Definition

```ts
export const weatherAgentWithWorkflow = new Agent({
  name: 'Weather Agent with Workflow',
  instructions: `You are a helpful weather assistant that provides accurate weather information.

Your primary function is to help users get weather details for specific locations. When responding:
- Always ask for a location if none is provided
- If the location name isn’t in English, please translate it
- If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
- Include relevant details like humidity, wind conditions, and precipitation
- Keep responses concise but informative

Use the startWeatherTool to start the weather workflow. This will start and then suspend the workflow and return a runId.
Use the resumeWeatherTool to resume the weather workflow. This takes the runId returned from the startWeatherTool and the city entered by the user. It will resume the workflow and return the result.
The result will be the weather forecast for the city.`,
  model: openai('gpt-4o'),
  tools: { startWeatherTool, resumeWeatherTool },
});
```

### Agent Execution
```ts
const mastra = new Mastra({
  agents: { weatherAgentWithWorkflow },
  workflows: { weatherWorkflowWithSuspend },
});

const agent = mastra.getAgent('weatherAgentWithWorkflow');
const result = await agent.generate([
  {
    role: 'user',
    content: 'London',
  },
]);

console.log(result);
```

<br/>

<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/agents/workflow-as-tools"
  }
/>


---
title: Deployment examples
---

# Examples
[EN] Source: https://mastra.ai/en/examples

The Examples section is a short list of example projects demonstrating basic AI engineering with Mastra, including text generation, structured output, streaming responses, retrieval‐augmented generation (RAG), and voice.

<CardItems titles={["Agent", "Workflow", "legacyWorkflow", "Memory", "RAG", "Evals", "Voice"]} items={
  {
    Agent: [
      {
        title: "Agent with System Prompt",
        href: "/examples/agents/system-prompt",
      },
      {
        title: "Workflow as Tools",
        href: "/examples/agents/workflow-as-tools",
      },
      {
        title: "Using a Tool",
        href: "/examples/agents/using-a-tool",
      },
      {
        title: "Hierarchical Multi-Agent System",
        href: "/examples/agents/hierarchical-multi-agent",
      },
      {
        title: "Multi-Agent Workflow",
        href: "/examples/agents/multi-agent-workflow",
      },
      {
        title: "Bird Checker",
        href: "/examples/agents/bird-checker",
      },
      {
        title: "Dynamic Agents",
        href: "/examples/agents/dynamic-agents"
      }
    ],
    Workflow: [
      {
        title: "Conditional Branching",
        href: "/examples/workflows/conditional-branching",
      },
      {
        title: "Parallel Steps",
        href: "/examples/workflows/parallel-steps",
      },
      {
        title: "Calling an Agent",
        href: "/examples/workflows/calling-agent",
      },
      {
        title: "Tool & Agent as a Step",
        href: "/examples/workflows/agent-and-tool-interop",
      },
      {
        title: "Human in the loop",
        href: "/examples/workflows/human-in-the-loop",
      },
      {
        title: "Control Flow",
        href: "/examples/workflows/control-flow",
      },
      {
        title: "Array as Input",
        href: "/examples/workflows/array-as-input",
      }
    ],
    legacyWorkflow: [
      {
        title: "Creating a Workflow",
        href: "/examples/workflows_legacy/creating-a-workflow",
      },
      {
        title: "Using a Tool as a Step",
        href: "/examples/workflows_legacy/using-a-tool-as-a-step",
      },
      { title: "Parallel Steps", href: "/examples/workflows_legacy/parallel-steps" },
      {
        title: "Sequential Steps",
        href: "/examples/workflows_legacy/sequential-steps",
      },
      { title: "Branching Paths", href: "/examples/workflows_legacy/branching-paths" },
      {
        title: "Cyclical Dependencies",
        href: "/examples/workflows_legacy/cyclical-dependencies",
      },
      {
        title: "Suspend and Resume",
        href: "/examples/workflows_legacy/suspend-and-resume",
      },
      { title: "Calling an Agent", href: "/examples/workflows_legacy/calling-agent" },
    ],
    Memory:[
      {
        title: "Long-term Memory with LibSQL",
        href: "/examples/memory/memory-with-libsql",
      },
      {
        title: "Long-term Memory with Postgres",
        href: "/examples/memory/memory-with-pg",
      },
      {
        title: "Long-term Memory with Upstash",
        href: "/examples/memory/memory-with-upstash",
      },
      {
        title: "Long-term Memory with Mem0",
        href: "/examples/memory/memory-with-mem0"
      },
      {
        title: "Streaming Working Memory (quickstart)",
        href: "/examples/memory/streaming-working-memory",
      },
      {
        title: "Streaming Working Memory (advanced)",
        href: "/examples/memory/streaming-working-memory-advanced",
      },
    ],
    RAG: [
      { title: "Chunk Text", href: "/examples/rag/chunking/chunk-text" },
      { title: "Chunk Markdown", href: "/examples/rag/chunking/chunk-markdown" },
      { title: "Chunk HTML", href: "/examples/rag/chunking/chunk-html" },
      { title: "Chunk JSON", href: "/examples/rag/chunking/chunk-json" },
      { title: "Embed Text Chunk", href: "/examples/rag/embedding/embed-text-chunk" },
      { title: "Embed Chunk Array", href: "/examples/rag/embedding/embed-chunk-array" },
      { title: "Adjust Chunk Size", href: "/examples/rag/chunking/adjust-chunk-size" },
      {
        title: "Adjust Chunk Delimiters",
        href: "/examples/rag/chunking/adjust-chunk-delimiters",
      },
      {
        title: "Metadata Extraction",
        href: "/examples/rag/embedding/metadata-extraction",
      },
      {
        title: "Hybrid Vector Search",
        href: "/examples/rag/query/hybrid-vector-search",
      },
      {
        title: "Embed Text with Cohere",
        href: "/examples/rag/embedding/embed-text-with-cohere",
      },
      {
        title: "Upsert Embeddings",
        href: "/examples/rag/upsert/upsert-embeddings",
      },
      { title: "Retrieve Results", href: "/examples/rag/query/retrieve-results" },
      { title: "Using the Vector Query Tool", href: "/examples/rag/usage/basic-rag" },
      {
        title: "Optimizing Information Density",
        href: "/examples/rag/usage/cleanup-rag",
      },
      { title: "Metadata Filtering", href: "/examples/rag/usage/filter-rag" },
      {
        title: "Re-ranking Results",
        href: "/examples/rag/rerank/rerank",
      },
      {
        title: "Re-ranking Results with Tools",
        href: "/examples/rag/rerank/rerank-rag",
      },
      { title: "Chain of Thought Prompting", href: "/examples/rag/usage/cot-rag" },
      {
        title: "Structured Reasoning with Workflows",
        href: "/examples/rag/usage/cot-workflow-rag",
      },
      { title: "Graph RAG", href: "/examples/rag/usage/graph-rag" },
    ],
    Evals: [
      {
        title: "Answer Relevancy",
        href: "/examples/evals/answer-relevancy",
      },
      {
        title: "Bias",
        href: "/examples/evals/bias",
      },
      {
        title: "Completeness",
        href: "/examples/evals/completeness",
      },
      {
        title: "Content Similarity",
        href: "/examples/evals/content-similarity",
      },
      {
        title: "Context Position",
        href: "/examples/evals/context-position",
      },
      {
        title: "Context Precision",
        href: "/examples/evals/context-precision",
      },
      {
        title: "Context Relevancy",
        href: "/examples/evals/context-relevancy",
      },
      {
        title: "Contextual Recall",
        href: "/examples/evals/contextual-recall",
      },
      {
        title: "Custom Eval with LLM as a Judge",
        href: "/examples/evals/custom-eval",
      },
      {
        title: "Faithfulness",
        href: "/examples/evals/faithfulness",
      },
      {
        title: "Hallucination",
        href: "/examples/evals/hallucination",
      },
      {
        title: "Keyword Coverage",
        href: "/examples/evals/keyword-coverage",
      },
      {
        title: "Prompt Alignment",
        href: "/examples/evals/prompt-alignment",
      },
      {
        title: "Summarization",
        href: "/examples/evals/summarization",
      },
      {
        title: "Textual Difference",
        href: "/examples/evals/textual-difference",
      },
      {
        title: "Tone Consistency", 
        href: "/examples/evals/tone-consistency",
      },
      {
        title: "Toxicity",
        href: "/examples/evals/toxicity",
      },
      {
        title: "Word Inclusion",
        href: "/examples/evals/word-inclusion",
      },
    ],
    Voice: [
    {
      title: "Text to Speech",
      href: "/examples/voice/text-to-speech",
    },
    {
      title: "Speech to Text",
      href: "/examples/voice/speech-to-text",
    },
    {
      title: "Turn Taking",
      href: "/examples/voice/turn-taking",
    },
    {
      title: "Speech to Speech",
      href: "/examples/voice/speech-to-speech",
    },
    ],
}}>

</CardItems>


---
title: "Example: Adjusting Chunk Delimiters | RAG | Mastra Docs"
description: Adjust chunk delimiters in Mastra to better match your content structure.
---

import { GithubLink } from "@/components/github-link";

# Adjust Chunk Delimiters
[EN] Source: https://mastra.ai/en/examples/rag/chunking/adjust-chunk-delimiters

When processing large documents, you may want to control how the text is split into smaller chunks. By default, documents are split on newlines, but you can customize this behavior to better match your content structure. This example shows how to specify a custom delimiter for chunking documents.

```tsx copy
import { MDocument } from "@mastra/rag";

const doc = MDocument.fromText("Your plain text content...");

const chunks = await doc.chunk({
  separator: "\n",
});
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/adjust-chunk-delimiters"
  }
/>


---
title: "Example: Adjusting The Chunk Size | RAG | Mastra Docs"
description: Adjust chunk size in Mastra to better match your content and memory requirements.
---

import { GithubLink } from "@/components/github-link";

# Adjust Chunk Size
[EN] Source: https://mastra.ai/en/examples/rag/chunking/adjust-chunk-size

When processing large documents, you might need to adjust how much text is included in each chunk. By default, chunks are 1024 characters long, but you can customize this size to better match your content and memory requirements. This example shows how to set a custom chunk size when splitting documents.

```tsx copy
import { MDocument } from "@mastra/rag";

const doc = MDocument.fromText("Your plain text content...");

const chunks = await doc.chunk({
  size: 512,
});
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/adjust-chunk-size"
  }
/>


---
title: "Example: Semantically Chunking HTML | RAG | Mastra Docs"
description: Chunk HTML content in Mastra to semantically chunk the document.
---

import { GithubLink } from "@/components/github-link";

# Semantically Chunking HTML
[EN] Source: https://mastra.ai/en/examples/rag/chunking/chunk-html

When working with HTML content, you often need to break it down into smaller, manageable pieces while preserving the document structure. The chunk method splits HTML content intelligently, maintaining the integrity of HTML tags and elements. This example shows how to chunk HTML documents for search or retrieval purposes.

```tsx copy
import { MDocument } from "@mastra/rag";

const html = `
<div>
    <h1>h1 content...</h1>
    <p>p content...</p>
</div>
`;

const doc = MDocument.fromHTML(html);

const chunks = await doc.chunk({
  headers: [
    ["h1", "Header 1"],
    ["p", "Paragraph"],
  ],
});

console.log(chunks);
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/chunk-html"
  }
/>


---
title: "Example: Semantically Chunking JSON | RAG | Mastra Docs"
description: Chunk JSON data in Mastra to semantically chunk the document.
---

import { GithubLink } from "@/components/github-link";

# Semantically Chunking JSON
[EN] Source: https://mastra.ai/en/examples/rag/chunking/chunk-json

When working with JSON data, you need to split it into smaller pieces while preserving the object structure. The chunk method breaks down JSON content intelligently, maintaining the relationships between keys and values. This example shows how to chunk JSON documents for search or retrieval purposes.

```tsx copy
import { MDocument } from "@mastra/rag";

const testJson = {
  name: "John Doe",
  age: 30,
  email: "john.doe@example.com",
};

const doc = MDocument.fromJSON(JSON.stringify(testJson));

const chunks = await doc.chunk({
  maxSize: 100,
});

console.log(chunks);
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/chunk-json"
  }
/>


---
title: "Example: Semantically Chunking Markdown | RAG | Mastra Docs"
description: Example of using Mastra to chunk markdown documents for search or retrieval purposes.
---

import { GithubLink } from "@/components/github-link";

# Chunk Markdown
[EN] Source: https://mastra.ai/en/examples/rag/chunking/chunk-markdown

Markdown is more information-dense than raw HTML, making it easier to work with for RAG pipelines. When working with markdown, you need to split it into smaller pieces while preserving headers and formatting. The `chunk` method handles Markdown-specific elements like headers, lists, and code blocks intelligently. This example shows how to chunk markdown documents for search or retrieval purposes.

```tsx copy
import { MDocument } from "@mastra/rag";

const doc = MDocument.fromMarkdown("# Your markdown content...");

const chunks = await doc.chunk();
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/chunk-markdown"
  }
/>


---
title: "Example: Semantically Chunking Text | RAG | Mastra Docs"
description: Example of using Mastra to split large text documents into smaller chunks for processing.
---

import { GithubLink } from "@/components/github-link";

# Chunk Text
[EN] Source: https://mastra.ai/en/examples/rag/chunking/chunk-text

When working with large text documents, you need to break them down into smaller, manageable pieces for processing. The chunk method splits text content into segments that can be used for search, analysis, or retrieval. This example shows how to split plain text into chunks using default settings.

```tsx copy
import { MDocument } from "@mastra/rag";

const doc = MDocument.fromText("Your plain text content...");

const chunks = await doc.chunk();
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/chunk-text"
  }
/>


---
title: "Example: Embedding Chunk Arrays | RAG | Mastra Docs"
description: Example of using Mastra to generate embeddings for an array of text chunks for similarity search.
---

import { GithubLink } from "@/components/github-link";

# Embed Chunk Array
[EN] Source: https://mastra.ai/en/examples/rag/embedding/embed-chunk-array

After chunking documents, you need to convert the text chunks into numerical vectors that can be used for similarity search. The `embed` method transforms text chunks into embeddings using your chosen provider and model. This example shows how to generate embeddings for an array of text chunks.

```tsx copy
import { openai } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import { embed } from "ai";

const doc = MDocument.fromText("Your text content...");

const chunks = await doc.chunk();

const { embeddings } = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: chunks.map((chunk) => chunk.text),
});
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/embed-chunk-array"
  }
/>


---
title: "Example: Embedding Text Chunks | RAG | Mastra Docs"
description: Example of using Mastra to generate an embedding for a single text chunk for similarity search.
---

import { GithubLink } from "@/components/github-link";

# Embed Text Chunk
[EN] Source: https://mastra.ai/en/examples/rag/embedding/embed-text-chunk

When working with individual text chunks, you need to convert them into numerical vectors for similarity search. The `embed` method transforms a single text chunk into an embedding using your chosen provider and model.

```tsx copy
import { openai } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import { embed } from "ai";

const doc = MDocument.fromText("Your text content...");

const chunks = await doc.chunk();

const { embedding } = await embed({
  model: openai.embedding("text-embedding-3-small"),
  value: chunks[0].text,
});
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/embed-text-chunk"
  }
/>


---
title: "Example: Embedding Text with Cohere | RAG | Mastra Docs"
description: Example of using Mastra to generate embeddings using Cohere's embedding model.
---

import { GithubLink } from "@/components/github-link";

# Embed Text with Cohere
[EN] Source: https://mastra.ai/en/examples/rag/embedding/embed-text-with-cohere

When working with alternative embedding providers, you need a way to generate vectors that match your chosen model's specifications. The `embed` method supports multiple providers, allowing you to switch between different embedding services. This example shows how to generate embeddings using Cohere's embedding model.

```tsx copy
import { cohere } from "@ai-sdk/cohere";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";

const doc = MDocument.fromText("Your text content...");

const chunks = await doc.chunk();

const { embeddings } = await embedMany({
  model: cohere.embedding("embed-english-v3.0"),
  values: chunks.map((chunk) => chunk.text),
});
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/embed-text-with-cohere"
  }
/>


---
title: "Example: Metadata Extraction | Retrieval | RAG | Mastra Docs"
description: Example of extracting and utilizing metadata from documents in Mastra for enhanced document processing and retrieval.
---

import { GithubLink } from "@/components/github-link";

# Metadata Extraction
[EN] Source: https://mastra.ai/en/examples/rag/embedding/metadata-extraction

This example demonstrates how to extract and utilize metadata from documents using Mastra's document processing capabilities.
The extracted metadata can be used for document organization, filtering, and enhanced retrieval in RAG systems.

## Overview

The system demonstrates metadata extraction in two ways:

1. Direct metadata extraction from a document
2. Chunking with metadata extraction

## Setup

### Dependencies

Import the necessary dependencies:

```typescript copy showLineNumbers filename="src/index.ts"
import { MDocument } from "@mastra/rag";
```

## Document Creation

Create a document from text content:

```typescript copy showLineNumbers{3} filename="src/index.ts"
const doc = MDocument.fromText(`Title: The Benefits of Regular Exercise

Regular exercise has numerous health benefits. It improves cardiovascular health, 
strengthens muscles, and boosts mental wellbeing.

Key Benefits:
• Reduces stress and anxiety
• Improves sleep quality
• Helps maintain healthy weight
• Increases energy levels

For optimal results, experts recommend at least 150 minutes of moderate exercise 
per week.`);
```

## 1. Direct Metadata Extraction

Extract metadata directly from the document:

```typescript copy showLineNumbers{17} filename="src/index.ts"
// Configure metadata extraction options
await doc.extractMetadata({
  keywords: true, // Extract important keywords
  summary: true, // Generate a concise summary
});

// Retrieve the extracted metadata
const meta = doc.getMetadata();
console.log("Extracted Metadata:", meta);

// Example Output:
// Extracted Metadata: {
//   keywords: [
//     'exercise',
//     'health benefits',
//     'cardiovascular health',
//     'mental wellbeing',
//     'stress reduction',
//     'sleep quality'
//   ],
//   summary: 'Regular exercise provides multiple health benefits including improved cardiovascular health, muscle strength, and mental wellbeing. Key benefits include stress reduction, better sleep, weight management, and increased energy. Recommended exercise duration is 150 minutes per week.'
// }
```

## 2. Chunking with Metadata

Combine document chunking with metadata extraction:

```typescript copy showLineNumbers{40} filename="src/index.ts"
// Configure chunking with metadata extraction
await doc.chunk({
  strategy: "recursive", // Use recursive chunking strategy
  size: 200, // Maximum chunk size
  extract: {
    keywords: true, // Extract keywords per chunk
    summary: true, // Generate summary per chunk
  },
});

// Get metadata from chunks
const metaTwo = doc.getMetadata();
console.log("Chunk Metadata:", metaTwo);

// Example Output:
// Chunk Metadata: {
//   keywords: [
//     'exercise',
//     'health benefits',
//     'cardiovascular health',
//     'mental wellbeing',
//     'stress reduction',
//     'sleep quality'
//   ],
//   summary: 'Regular exercise provides multiple health benefits including improved cardiovascular health, muscle strength, and mental wellbeing. Key benefits include stress reduction, better sleep, weight management, and increased energy. Recommended exercise duration is 150 minutes per week.'
// }
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/rag/metadata-extraction"
  }
/>


---
title: "Example: Hybrid Vector Search | RAG | Mastra Docs"
description: Example of using metadata filters with PGVector to enhance vector search results in Mastra.
---

import { GithubLink } from "@/components/github-link";

# Tool/Agent as a Workflow step
[EN] Source: https://mastra.ai/en/examples/workflows/agent-and-tool-interop

This example demonstrates how to create and integrate a tool or an agent as a workflow step.
Mastra provides a `createStep` helper function which accepts either a step or agent and returns an object which satisfies the Step interface.

## Setup

```sh copy
npm install @ai-sdk/openai @mastra/core
```

## Define Weather Reporter Agent

Define a weather reporter agent that leverages an LLM to explain the weather report like a weather reporter.

```ts showLineNumbers copy filename="agents/weather-reporter-agent.ts"
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

// Create an agent that explains weather reports in a conversational style
export const weatherReporterAgent = new Agent({
  name: "weatherExplainerAgent",
  model: openai("gpt-4o"),
  instructions: `
  You are a weather explainer. You have access to input that will help you get weather-specific activities for any city.
  The tool uses agents to plan the activities, you just need to provide the city. Explain the weather report like a weather reporter.
  `,
});
```

## Define Weather Tool

Define a weather tool that take a location name as input and outputs detailed weather information.

```ts showLineNumbers copy filename="tools/weather-tool.ts"
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}
interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

// Create a tool to fetch weather data
export const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

// Helper function to fetch weather data from external APIs
const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

// Helper function to convert numeric weather codes to human-readable descriptions
function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return conditions[code] || "Unknown";
}
```

## Define Interop Workflow

Defines a workflow which takes an agent and tool as a step.

```ts showLineNumbers copy filename="workflows/interop-workflow.ts"
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { weatherTool } from "../tools/weather-tool";
import { weatherReporterAgent } from "../agents/weather-reporter-agent";
import { z } from "zod";

// Create workflow steps from existing tool and agent
const fetchWeather = createStep(weatherTool);
const reportWeather = createStep(weatherReporterAgent);

const weatherWorkflow = createWorkflow({
  steps: [fetchWeather, reportWeather],
  id: "weather-workflow-step1-single-day",
  inputSchema: z.object({
    location: z.string().describe("The city to get the weather for"),
  }),
  outputSchema: z.object({
    text: z.string(),
  }),
})
  .then(fetchWeather)
  .then(
    createStep({
      id: "report-weather",
      inputSchema: fetchWeather.outputSchema,
      outputSchema: z.object({
        text: z.string(),
      }),
      execute: async ({ inputData, mastra }) => {
        // Create a prompt with the weather data
        const prompt = "Forecast data: " + JSON.stringify(inputData);
        const agent = mastra.getAgent("weatherReporterAgent");

        // Generate a weather report using the agent
        const result = await agent.generate([
          {
            role: "user",
            content: prompt,
          },
        ]);
        return { text: result.text };
      },
    }),
  );

weatherWorkflow.commit();

export { weatherWorkflow };
```

## Register Workflow instance with Mastra class

Register the workflow with the mastra instance.

```ts showLineNumbers copy filename="index.ts"
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { weatherWorkflow } from "./workflows/interop-workflow";
import { weatherReporterAgent } from "./agents/weather-reporter-agent";

// Create a new Mastra instance with our components
const mastra = new Mastra({
  workflows: {
    weatherWorkflow,
  },
  agents: {
    weatherReporterAgent,
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});

export { mastra };
```

## Execute the workflow

Here, we'll get the weather workflow from the mastra instance, then create a run and execute the created run with the required inputData.

```ts showLineNumbers copy filename="exec.ts"
import { mastra } from "./";

const workflow = mastra.getWorkflow("weatherWorkflow");
const run = await workflow.createRunAsync();

// Start the workflow with Lagos as the location
const result = await run.start({ inputData: { location: "Lagos" } });
console.dir(result, { depth: null });
```

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)



---
title: "Example: Array as Input (.foreach()) | Workflows | Mastra Docs"
description: Example of using Mastra to process an array using .foreach() in a workflow.
---

# Array as Input
[EN] Source: https://mastra.ai/en/examples/workflows/array-as-input

This example demonstrates how to process an array input in a workflow. Mastra provides a `.foreach()` helper function that executes a step for each item in the array.

## Setup

```sh copy
npm install @ai-sdk/openai @mastra/core simple-git
```

## Define Docs Generator Agent

Define a docs generator agent that leverages an LLM call to generate a documentation given a code file or a summary of a code file.

```ts showLineNumbers copy filename="agents/docs-generator-agent.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

// Create a documentation generator agent for code analysis
const docGeneratorAgent = new Agent({
  name: "doc_generator_agent",
  instructions: `You are a technical documentation expert. You will analyze the provided code files and generate a comprehensive documentation summary.
            For each file:
            1. Identify the main purpose and functionality
            2. Document key components, classes, functions, and interfaces
            3. Note important dependencies and relationships between components
            4. Highlight any notable patterns or architectural decisions
            5. Include relevant code examples where helpful

            Format the documentation in a clear, organized manner using markdown with:
            - File overviews
            - Component breakdowns
            - Code examples
            - Cross-references between related components

            Focus on making the documentation clear and useful for developers who need to understand and work with this codebase.`,
  model: openai("gpt-4o"),
});

export { docGeneratorAgent };
```

## Define File Summary Workflow

Define the file summary workflow with 2 steps: one to fetch the code of a particular file and another to generate a readme for that particular code file.

```ts showLineNumbers copy filename="workflows/file-summary-workflow.ts"
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { docGeneratorAgent } from "../agents/docs-generator-agent";
import { z } from "zod";
import fs from "fs";

// Step 1: Read the code content from a file
const scrapeCodeStep = createStep({
  id: "scrape_code",
  description: "Scrape the code from a single file",
  inputSchema: z.string(),
  outputSchema: z.object({
    path: z.string(),
    content: z.string(),
  }),
  execute: async ({ inputData }) => {
    const filePath = inputData;
    const content = fs.readFileSync(filePath, "utf-8");
    return {
      path: filePath,
      content,
    };
  },
});

// Step 2: Generate documentation for a single file
const generateDocForFileStep = createStep({
  id: "generateDocForFile",
  inputSchema: z.object({
    path: z.string(),
    content: z.string(),
  }),
  outputSchema: z.object({
    path: z.string(),
    documentation: z.string(),
  }),
  execute: async ({ inputData }) => {
    const docs = await docGeneratorAgent.generate(
      `Generate documentation for the following code: ${inputData.content}`,
    );
    return {
      path: inputData.path,
      documentation: docs.text.toString(),
    };
  },
});

const generateSummaryWorkflow = createWorkflow({
  id: "generate-summary",
  inputSchema: z.string(),
  outputSchema: z.object({
    path: z.string(),
    documentation: z.string(),
  }),
  steps: [scrapeCodeStep, generateDocForFileStep],
})
  .then(scrapeCodeStep)
  .then(generateDocForFileStep)
  .commit();

export { generateSummaryWorkflow };
```

## Define Readme Generator Workflow

Define a readme generator workflow with 4 steps: one to clone the github repository, one to suspend the workflow and get user input on what all folders to consider while generating a readme, one to generate a summary of all the files inside the folder, and another to collate all the documentation generated for each file into a single readme.

```ts showLineNumbers copy filename="workflows/readme-generator-workflow.ts
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { docGeneratorAgent } from "../agents/docs-generator-agent";
import { generateSummaryWorkflow } from "./file-summary-workflow";
import { z } from "zod";
import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

// Step 1: Clone a GitHub repository locally
const cloneRepositoryStep = createStep({
  id: "clone_repository",
  description: "Clone the repository from the given URL",
  inputSchema: z.object({
    repoUrl: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
      repoUrl: z.string(),
    }),
  }),
  execute: async ({
    inputData,
    mastra,
    getStepResult,
    getInitData,
    runtimeContext,
  }) => {
    const git = simpleGit();
    // Skip cloning if repo already exists
    if (fs.existsSync("./temp")) {
      return {
        success: true,
        message: "Repository already exists",
        data: {
          repoUrl: inputData.repoUrl,
        },
      };
    }
    try {
      // Clone the repository to the ./temp directory
      await git.clone(inputData.repoUrl, "./temp");
      return {
        success: true,
        message: "Repository cloned successfully",
        data: {
          repoUrl: inputData.repoUrl,
        },
      };
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    }
  },
});

// Step 2: Get user input on which folders to analyze
const selectFolderStep = createStep({
  id: "select_folder",
  description: "Select the folder(s) to generate the docs",
  inputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
      repoUrl: z.string(),
    }),
  }),
  outputSchema: z.array(z.string()),
  suspendSchema: z.object({
    folders: z.array(z.string()),
    message: z.string(),
  }),
  resumeSchema: z.object({
    selection: z.array(z.string()),
  }),
  execute: async ({ resumeData, suspend }) => {
    const tempPath = "./temp";
    const folders = fs
      .readdirSync(tempPath)
      .filter((item) => fs.statSync(path.join(tempPath, item)).isDirectory());

    if (!resumeData?.selection) {
      await suspend({
        folders,
        message: "Please select folders to generate documentation for:",
      });
      return [];
    }

    // Gather all file paths from selected folders
    const filePaths: string[] = [];
    // Helper function to recursively read files from directories
    const readFilesRecursively = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          readFilesRecursively(fullPath);
        } else if (stat.isFile()) {
          filePaths.push(fullPath.replace(tempPath + "/", ""));
        }
      }
    };

    for (const folder of resumeData.selection) {
      readFilesRecursively(path.join(tempPath, folder));
    }

    return filePaths;
  },
});

// Step 4: Combine all documentation into a single README
const collateDocumentationStep = createStep({
  id: "collate_documentation",
  inputSchema: z.array(
    z.object({
      path: z.string(),
      documentation: z.string(),
    }),
  ),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    const readme = await docGeneratorAgent.generate(
      `Generate a README.md file for the following documentation: ${inputData.map((doc) => doc.documentation).join("\n")}`,
    );

    return readme.text.toString();
  },
});

const readmeGeneratorWorkflow = createWorkflow({
  id: "readme-generator",
  inputSchema: z.object({
    repoUrl: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.object({
      repoUrl: z.string(),
    }),
  }),
  steps: [
    cloneRepositoryStep,
    selectFolderStep,
    generateSummaryWorkflow,
    collateDocumentationStep,
  ],
})
  .then(cloneRepositoryStep)
  .then(selectFolderStep)
  .foreach(generateSummaryWorkflow)
  .then(collateDocumentationStep)
  .commit();

export { readmeGeneratorWorkflow };
```

## Register Agent and Workflow instances with Mastra class

Register the agents and workflow with the mastra instance. This is critical for enabling access to the agents within the workflow.

```ts showLineNumbers copy filename="index.ts"
import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";
import { docGeneratorAgent } from "./agents/docs-generator-agent";
import { readmeGeneratorWorkflow } from "./workflows/readme-generator-workflow";
import { generateSummaryWorkflow } from "./workflows/file-summary-workflow";

// Create a new Mastra instance and register components
const mastra = new Mastra({
  agents: {
    docGeneratorAgent,
  },
  workflows: {
    readmeGeneratorWorkflow,
    generateSummaryWorkflow,
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});

export { mastra };
```

## Execute the Readme Generator Workflow

Here, we'll get the reamde generator workflow from the mastra instance, then create a run and execute the created run with the required inputData.

```ts showLineNumbers copy filename="exec.ts"
import { promptUserForFolders } from "./utils";
import { mastra } from "./";

// GitHub repository to generate documentation for
const ghRepoUrl = "https://github.com/mastra-ai/mastra";
const run = await mastra.getWorkflow("readmeGeneratorWorkflow").createRunAsync();

// Start the workflow with the repository URL as input
const res = await run.start({ inputData: { repoUrl: ghRepoUrl } });
const { status, steps } = res;

// Handle suspended workflow (waiting for user input)
if (status === "suspended") {
  // Get the suspended step data
  const suspendedStep = steps["select_folder"];
  let folderList: string[] = [];

  // Extract the folder list from step data
  if (
    suspendedStep.status === "suspended" &&
    "folders" in suspendedStep.payload
  ) {
    folderList = suspendedStep.payload.folders as string[];
  } else if (suspendedStep.status === "success" && suspendedStep.output) {
    folderList = suspendedStep.output;
  }

  if (!folderList.length) {
    console.log("No folders available for selection.");
    process.exit(1);
  }

  // Prompt user to select folders
  const folders = await promptUserForFolders(folderList);

  // Resume the workflow with user selections
  const resumedResult = await run.resume({
    resumeData: { selection: folders },
    step: "select_folder",
  });

  // Print resumed result
  if (resumedResult.status === "success") {
    console.log(resumedResult.result);
  } else {
    console.log(resumedResult);
  }
  process.exit(1);
}

// Handle completed workflow
if (res.status === "success") {
  console.log(res.result ?? res);
} else {
  console.log(res);
}
```

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)


---
title: "Example: Calling an Agent from a Workflow | Mastra Docs"
description: Example of using Mastra to call an AI agent from within a workflow step.
---

# Calling an Agent From a Workflow
[EN] Source: https://mastra.ai/en/examples/workflows/calling-agent

This example demonstrates how to create a workflow that calls an AI agent to suggest activities for the provided weather conditions, and execute it within a workflow step.

## Setup

```sh copy
npm install @ai-sdk/openai @mastra/core
```

## Define Planning Agent

Define a planning agent which leverages an LLM call to plan activities given a location and corresponding weather conditions.

```ts showLineNumbers copy filename="agents/planning-agent.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const llm = openai("gpt-4o");

// Create a new agent for activity planning
const planningAgent = new Agent({
  name: "planningAgent",
  model: llm,
  instructions: `
        You are a local activities and travel expert who excels at weather-based planning. Analyze the weather data and provide practical activity recommendations.

        📅 [Day, Month Date, Year]
        ═══════════════════════════

        🌡️ WEATHER SUMMARY
        • Conditions: [brief description]
        • Temperature: [X°C/Y°F to A°C/B°F]
        • Precipitation: [X% chance]

        🌅 MORNING ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🌞 AFTERNOON ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🏠 INDOOR ALTERNATIVES
        • [Activity Name] - [Brief description including specific venue]
          Ideal for: [weather condition that would trigger this alternative]

        ⚠️ SPECIAL CONSIDERATIONS
        • [Any relevant weather warnings, UV index, wind conditions, etc.]

        Guidelines:
        - Suggest 2-3 time-specific outdoor activities per day
        - Include 1-2 indoor backup options
        - For precipitation >50%, lead with indoor activities
        - All activities must be specific to the location
        - Include specific venues, trails, or locations
        - Consider activity intensity based on temperature
        - Keep descriptions concise but informative

        Maintain this exact formatting for consistency, using the emoji and section headers as shown.
      `,
});

export { planningAgent };
```

## Define Activity Planning Workflow

Define the activity planning workflow with 2 steps: one to fetch the weather via a network call, and another to plan activities using the planning agent.

```ts showLineNumbers copy filename="workflows/agent-workflow.ts"
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Helper function to convert numeric weather codes to human-readable descriptions
function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm",
  };
  return conditions[code] || "Unknown";
}

const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string(),
});
```

### Step 1: Create a step to fetch weather data for a given city

```ts showLineNumbers copy filename="workflows/agent-workflow.ts"
const fetchWeather = createStep({
  id: "fetch-weather",
  description: "Fetches weather forecast for a given city",
  inputSchema: z.object({
    city: z.string(),
  }),
  outputSchema: forecastSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Trigger data not found");
    }

    // First API call: Convert city name to latitude and longitude
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results: { latitude: number; longitude: number; name: string }[];
    };

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${inputData.city}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    // Second API call: Get weather data using coordinates
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      current: {
        time: string;
        precipitation: number;
        weathercode: number;
      };
      hourly: {
        precipitation_probability: number[];
        temperature_2m: number[];
      };
    };

    const forecast = {
      date: new Date().toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition(data.current.weathercode),
      location: name,
      precipitationChance: data.hourly.precipitation_probability.reduce(
        (acc, curr) => Math.max(acc, curr),
        0,
      ),
    };

    return forecast;
  },
});
```

### Step 2: Create a step to generate activity recommendations using the agent

```ts showLineNumbers copy filename="workflows/agent-workflow.ts"
const planActivities = createStep({
  id: "plan-activities",
  description: "Suggests activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;

    if (!forecast) {
      throw new Error("Forecast data not found");
    }

    const prompt = `Based on the following weather forecast for ${forecast.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      `;

    const agent = mastra?.getAgent("planningAgent");
    if (!agent) {
      throw new Error("Planning agent not found");
    }

    const response = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let activitiesText = "";
    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }

    return {
      activities: activitiesText,
    };
  },
});

const activityPlanningWorkflow = createWorkflow({
  steps: [fetchWeather, planActivities],
  id: "activity-planning-step1-single-day",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for"),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
})
  .then(fetchWeather)
  .then(planActivities);

activityPlanningWorkflow.commit();

export { activityPlanningWorkflow };
```

## Register Agent and Workflow instances with Mastra class

Register the planning agent and activity planning workflow with the mastra instance.
This is critical for enabling access to the planning agent within the activity planning workflow.

```ts showLineNumbers copy filename="index.ts"
import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";
import { activityPlanningWorkflow } from "./workflows/agent-workflow";
import { planningAgent } from "./agents/planning-agent";

// Create a new Mastra instance and register components
const mastra = new Mastra({
  workflows: {
    activityPlanningWorkflow,
  },
  agents: {
    planningAgent,
  },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});

export { mastra };
```

## Execute the activity planning workflow

Here, we'll get the activity planning workflow from the mastra instance, then create a run and execute the created run with the required inputData.

```ts showLineNumbers copy filename="exec.ts"
import { mastra } from "./";

const workflow = mastra.getWorkflow("activityPlanningWorkflow");
const run = await workflow.createRunAsync();

// Start the workflow with New York as the city input
const result = await run.start({ inputData: { city: "New York" } });
console.dir(result, { depth: null });
```

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)



---
title: "Example: Conditional Branching | Workflows | Mastra Docs"
description: Example of using Mastra to create conditional branches in workflows using the `branch` statement .
---

# Workflow with Conditional Branching
[EN] Source: https://mastra.ai/en/examples/workflows/conditional-branching

Workflows often need to follow different paths based on some condition.
This example demonstrates how to use the `branch` construct to create conditional flows within your workflows.

## Setup

```sh copy
npm install @ai-sdk/openai @mastra/core
```

## Define Planning Agent

Define a planning agent which leverages an LLM call to plan activities given a location and corresponding weather conditions.

```ts showLineNumbers copy filename="agents/planning-agent.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const llm = openai("gpt-4o");

// Define the planning agent that generates activity recommendations
// based on weather conditions and location
const planningAgent = new Agent({
  name: "planningAgent",
  model: llm,
  instructions: `
        You are a local activities and travel expert who excels at weather-based planning. Analyze the weather data and provide practical activity recommendations.

        📅 [Day, Month Date, Year]
        ═══════════════════════════

        🌡️ WEATHER SUMMARY
        • Conditions: [brief description]
        • Temperature: [X°C/Y°F to A°C/B°F]
        • Precipitation: [X% chance]

        🌅 MORNING ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🌞 AFTERNOON ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🏠 INDOOR ALTERNATIVES
        • [Activity Name] - [Brief description including specific venue]
          Ideal for: [weather condition that would trigger this alternative]

        ⚠️ SPECIAL CONSIDERATIONS
        • [Any relevant weather warnings, UV index, wind conditions, etc.]

        Guidelines:
        - Suggest 2-3 time-specific outdoor activities per day
        - Include 1-2 indoor backup options
        - For precipitation >50%, lead with indoor activities
        - All activities must be specific to the location
        - Include specific venues, trails, or locations
        - Consider activity intensity based on temperature
        - Keep descriptions concise but informative

        Maintain this exact formatting for consistency, using the emoji and section headers as shown.
      `,
});

export { planningAgent };
```

## Define Activity Planning Workflow

Define the planning workflow with 3 steps: one to fetch the weather via a network call, one to plan activities, and another to plan only indoor activities.
Both using the planning agent.

```ts showLineNumbers copy filename="workflows/conditional-workflow.ts"
import { z } from "zod";
import { createWorkflow, createStep } from "@mastra/core/workflows";

// Helper function to convert weather codes to human-readable conditions
function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm",
  };
  return conditions[code] || "Unknown";
}

const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string(),
});
```

### Step to fetch weather data for a given city

Makes API calls to get current weather conditions and forecast

```ts showLineNumbers copy filename="workflows/conditional-workflow.ts"
const fetchWeather = createStep({
  id: "fetch-weather",
  description: "Fetches weather forecast for a given city",
  inputSchema: z.object({
    city: z.string(),
  }),
  outputSchema: forecastSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Trigger data not found");
    }

    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results: { latitude: number; longitude: number; name: string }[];
    };

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${inputData.city}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      current: {
        time: string;
        precipitation: number;
        weathercode: number;
      };
      hourly: {
        precipitation_probability: number[];
        temperature_2m: number[];
      };
    };

    const forecast = {
      date: new Date().toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition(data.current.weathercode),
      location: name,
      precipitationChance: data.hourly.precipitation_probability.reduce(
        (acc, curr) => Math.max(acc, curr),
        0,
      ),
    };

    return forecast;
  },
});
```

### Step to plan activities based on weather conditions

Uses the planning agent to generate activity recommendations

```ts showLineNumbers copy filename="workflows/conditional-workflow.ts"
const planActivities = createStep({
  id: "plan-activities",
  description: "Suggests activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;

    if (!forecast) {
      throw new Error("Forecast data not found");
    }

    const prompt = `Based on the following weather forecast for ${forecast.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      `;

    const agent = mastra?.getAgent("planningAgent");
    if (!agent) {
      throw new Error("Planning agent not found");
    }

    const response = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let activitiesText = "";

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }

    return {
      activities: activitiesText,
    };
  },
});
```

### Step to plan indoor activities only

Used when precipitation chance is high

```ts showLineNumbers copy filename="workflows/conditional-workflow.ts"
const planIndoorActivities = createStep({
  id: "plan-indoor-activities",
  description: "Suggests indoor activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;

    if (!forecast) {
      throw new Error("Forecast data not found");
    }

    const prompt = `In case it rains, plan indoor activities for ${forecast.location} on ${forecast.date}`;

    const agent = mastra?.getAgent("planningAgent");
    if (!agent) {
      throw new Error("Planning agent not found");
    }

    const response = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let activitiesText = "";

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }

    return {
      activities: activitiesText,
    };
  },
});
```

### Main workflow

```ts showLineNumbers copy filename="workflows/conditional-workflow.ts"
const activityPlanningWorkflow = createWorkflow({
  id: "activity-planning-workflow-step2-if-else",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for"),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
})
  .then(fetchWeather)
  .branch([
    // Branch for high precipitation (indoor activities)
    [
      async ({ inputData }) => {
        return inputData?.precipitationChance > 50;
      },
      planIndoorActivities,
    ],
    // Branch for low precipitation (outdoor activities)
    [
      async ({ inputData }) => {
        return inputData?.precipitationChance <= 50;
      },
      planActivities,
    ],
  ]);

activityPlanningWorkflow.commit();

export { activityPlanningWorkflow };
```

## Register Agent and Workflow instances with Mastra class

Register the agents and workflow with the mastra instance.
This is critical for enabling access to the agents within the workflow.

```ts showLineNumbers copy filename="index.ts"
import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";
import { activityPlanningWorkflow } from "./workflows/conditional-workflow";
import { planningAgent } from "./agents/planning-agent";

// Initialize Mastra with the activity planning workflow
// This enables the workflow to be executed and access the planning agent
const mastra = new Mastra({
  workflows: {
    activityPlanningWorkflow,
  },
  agents: {
    planningAgent,
  },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});

export { mastra };
```

## Execute the activity planning workflow

Here, we'll get the activity planning workflow from the mastra instance, then create a run and execute the created run with the required inputData.

```ts showLineNumbers copy filename="exec.ts"
import { mastra } from "./";

const workflow = mastra.getWorkflow("activityPlanningWorkflow");
const run = await workflow.createRunAsync();

// Start the workflow with a city
// This will fetch weather and plan activities based on conditions
const result = await run.start({ inputData: { city: "New York" } });
console.dir(result, { depth: null });
```

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)



---
title: "Example: Control Flow | Workflows | Mastra Docs"
description: Example of using Mastra to create workflows with loops based on provided conditions.
---

# Looping step execution
[EN] Source: https://mastra.ai/en/examples/workflows/control-flow

## Setup

```sh copy
npm install @ai-sdk/openai @mastra/core
```

## Define Looping workflow

Defines a workflow which calls the executes a nested workflow until the provided condition is met.

```ts showLineNumbers copy filename="looping-workflow.ts"
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Step that increments the input value by 1
const incrementStep = createStep({
  id: "increment",
  inputSchema: z.object({
    value: z.number(),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
  execute: async ({ inputData }) => {
    return { value: inputData.value + 1 };
  },
});

// Step that logs the current value (side effect)
const sideEffectStep = createStep({
  id: "side-effect",
  inputSchema: z.object({
    value: z.number(),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
  execute: async ({ inputData }) => {
    console.log("log", inputData.value);
    return { value: inputData.value };
  },
});

// Final step that returns the final value
const finalStep = createStep({
  id: "final",
  inputSchema: z.object({
    value: z.number(),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
  execute: async ({ inputData }) => {
    return { value: inputData.value };
  },
});

// Create a workflow that:
// 1. Increments a number until it reaches 10
// 2. Logs each increment (side effect)
// 3. Returns the final value
const workflow = createWorkflow({
  id: "increment-workflow",
  inputSchema: z.object({
    value: z.number(),
  }),
  outputSchema: z.object({
    value: z.number(),
  }),
})
  .dountil(
    // Nested workflow that performs the increment and logging
    createWorkflow({
      id: "increment-workflow",
      inputSchema: z.object({
        value: z.number(),
      }),
      outputSchema: z.object({
        value: z.number(),
      }),
      steps: [incrementStep, sideEffectStep],
    })
      .then(incrementStep)
      .then(sideEffectStep)
      .commit(),
    // Condition to check if we should stop the loop
    async ({ inputData }) => inputData.value >= 10,
  )
  .then(finalStep);

workflow.commit();

export { workflow as incrementWorkflow };
```

## Register Workflow instance with Mastra class

Register the workflow with the mastra instance.

```ts showLineNumbers copy filename="index.ts"
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { incrementWorkflow } from "./workflows";

// Initialize Mastra with the increment workflow
// This enables the workflow to be executed
const mastra = new Mastra({
  workflows: {
    incrementWorkflow,
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});

export { mastra };
```

## Execute the workflow

Here, we'll get the increment workflow from the mastra instance, then create a run and execute the created run with the required inputData.

```ts showLineNumbers copy filename="exec.ts"
import { mastra } from "./";

const workflow = mastra.getWorkflow("incrementWorkflow");
const run = await workflow.createRunAsync();

// Start the workflow with initial value 0
// This will increment until reaching 10
const result = await run.start({ inputData: { value: 0 } });
console.dir(result, { depth: null });
```

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)


---
title: "Example: Human in the Loop | Workflows | Mastra Docs"
description: Example of using Mastra to create workflows with human intervention points.
---

# Human in the Loop Workflow
[EN] Source: https://mastra.ai/en/examples/workflows/human-in-the-loop

Human-in-the-loop workflows allow you to pause execution at specific points to collect user input, make decisions, or perform actions that require human judgment.
This example demonstrates how to create a workflow with human intervention points.

## Setup

```sh copy
npm install @ai-sdk/openai @mastra/core @inquirer/prompts
```

## Define Agents

Define the travel agents.

```ts showLineNumbers copy filename="agents/travel-agents.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const llm = openai("gpt-4o");

// Agent that generates multiple holiday options
// Returns a JSON array of locations and descriptions
export const summaryTravelAgent = new Agent({
  name: "summaryTravelAgent",
  model: llm,
  instructions: `
  You are a travel agent who is given a user prompt about what kind of holiday they want to go on.
  You then generate 3 different options for the holiday. Return the suggestions as a JSON array {"location": "string", "description": "string"}[]. Don't format as markdown.
  Make the options as different as possible from each other.
  Also make the plan very short and summarized.
  `,
});

// Agent that creates detailed travel plans
// Takes the selected option and generates a comprehensive itinerary
export const travelAgent = new Agent({
  name: "travelAgent",
  model: llm,
  instructions: `
  You are a travel agent who is given a user prompt about what kind of holiday they want to go on. A summary of the plan is provided as well as the location.
  You then generate a detailed travel plan for the holiday.
  `,
});
```

## Define Suspendable workflow

Defines a workflow which includes a suspending step: `humanInputStep`.

```ts showLineNumbers copy filename="workflows/human-in-the-loop-workflow.ts"
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

// Step that generates multiple holiday options based on user's vacation description
// Uses the summaryTravelAgent to create diverse travel suggestions
const generateSuggestionsStep = createStep({
  id: "generate-suggestions",
  inputSchema: z.object({
    vacationDescription: z.string().describe("The description of the vacation"),
  }),
  outputSchema: z.object({
    suggestions: z.array(z.string()),
    vacationDescription: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    if (!mastra) {
      throw new Error("Mastra is not initialized");
    }

    const { vacationDescription } = inputData;
    const result = await mastra.getAgent("summaryTravelAgent").generate([
      {
        role: "user",
        content: vacationDescription,
      },
    ]);
    console.log(result.text);
    return { suggestions: JSON.parse(result.text), vacationDescription };
  },
});

// Step that pauses the workflow to get user input
// Allows the user to select their preferred holiday option from the suggestions
// Uses suspend/resume mechanism to handle the interaction
const humanInputStep = createStep({
  id: "human-input",
  inputSchema: z.object({
    suggestions: z.array(z.string()),
    vacationDescription: z.string(),
  }),
  outputSchema: z.object({
    selection: z.string().describe("The selection of the user"),
    vacationDescription: z.string(),
  }),
  resumeSchema: z.object({
    selection: z.string().describe("The selection of the user"),
  }),
  suspendSchema: z.object({
    suggestions: z.array(z.string()),
  }),
  execute: async ({ inputData, resumeData, suspend, getInitData }) => {
    if (!resumeData?.selection) {
      return suspend({ suggestions: inputData?.suggestions });
    }

    return {
      selection: resumeData?.selection,
      vacationDescription: inputData?.vacationDescription,
    };
  },
});

// Step that creates a detailed travel plan based on the user's selection
// Uses the travelAgent to generate comprehensive holiday details
const travelPlannerStep = createStep({
  id: "travel-planner",
  inputSchema: z.object({
    selection: z.string().describe("The selection of the user"),
    vacationDescription: z.string(),
  }),
  outputSchema: z.object({
    travelPlan: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const travelAgent = mastra?.getAgent("travelAgent");
    if (!travelAgent) {
      throw new Error("Travel agent is not initialized");
    }

    const { selection, vacationDescription } = inputData;
    const result = await travelAgent.generate([
      { role: "assistant", content: vacationDescription },
      { role: "user", content: selection || "" },
    ]);
    console.log(result.text);
    return { travelPlan: result.text };
  },
});

// Main workflow that orchestrates the holiday planning process:
// 1. Generates multiple options
// 2. Gets user input
// 3. Creates detailed plan
const travelAgentWorkflow = createWorkflow({
  id: "travel-agent-workflow",
  inputSchema: z.object({
    vacationDescription: z.string().describe("The description of the vacation"),
  }),
  outputSchema: z.object({
    travelPlan: z.string(),
  }),
})
  .then(generateSuggestionsStep)
  .then(humanInputStep)
  .then(travelPlannerStep);

travelAgentWorkflow.commit();

export { travelAgentWorkflow, humanInputStep };
```

## Register Agent and Workflow instances with Mastra class

Register the agents and the weather workflow with the mastra instance.
This is critical for enabling access to the agents within the workflow.

```ts showLineNumbers copy filename="index.ts"
import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";
import { travelAgentWorkflow } from "./workflows/human-in-the-loop-workflow";
import { summaryTravelAgent, travelAgent } from "./agents/travel-agent";

// Initialize Mastra instance with:
// - The travel planning workflow
// - Both travel agents (summary and detailed planning)
// - Logging configuration
const mastra = new Mastra({
  workflows: {
    travelAgentWorkflow,
  },
  agents: {
    travelAgent,
    summaryTravelAgent,
  },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});

export { mastra };
```

## Execute the suspendable weather workflow

Here, we'll get the weather workflow from the mastra instance, then create a run and execute the created run with the required inputData.
In addition to this, we'll resume the `humanInputStep` after collecting user input with the readline package.

```ts showLineNumbers copy filename="exec.ts"
import { mastra } from "./";
import { select } from "@inquirer/prompts";
import { humanInputStep } from "./workflows/human-in-the-loop-workflow";

const workflow = mastra.getWorkflow("travelAgentWorkflow");
const run = await workflow.createRunAsync();

// Start the workflow with initial vacation description
const result = await run.start({
  inputData: { vacationDescription: "I want to go to the beach" },
});

console.log("result", result);

const suggStep = result?.steps?.["generate-suggestions"];

// If suggestions were generated successfully, proceed with user interaction
if (suggStep.status === "success") {
  const suggestions = suggStep.output?.suggestions;

  // Present options to user and get their selection
  const userInput = await select<string>({
    message: "Choose your holiday destination",
    choices: suggestions.map(
      ({ location, description }: { location: string; description: string }) =>
        `- ${location}: ${description}`,
    ),
  });

  console.log("Selected:", userInput);

  // Prepare to resume the workflow with user's selection
  console.log("resuming from", result, "with", {
    inputData: {
      selection: userInput,
      vacationDescription: "I want to go to the beach",
      suggestions: suggStep?.output?.suggestions,
    },
    step: humanInputStep,
  });

  const result2 = await run.resume({
    resumeData: {
      selection: userInput,
    },
    step: humanInputStep,
  });

  console.dir(result2, { depth: null });
}
```

Human-in-the-loop workflows are powerful for building systems that blend automation with human judgment, such as:

- Content moderation systems
- Approval workflows
- Supervised AI systems
- Customer service automation with escalation

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)



---
title: "Inngest Workflow | Workflows | Mastra Docs"
description: Example of building an inngest workflow with Mastra
---

# Inngest Workflow
[EN] Source: https://mastra.ai/en/examples/workflows/inngest-workflow

This example demonstrates how to build an Inngest workflow with Mastra.

## Setup

```sh copy
npm install @mastra/inngest inngest @mastra/core @mastra/deployer @hono/node-server @ai-sdk/openai

docker run --rm -p 3000:3000 \
  inngest/inngest \
  inngest dev -u http://host.docker.internal:3000/inngest/api
```

Alternatively, you can use the Inngest CLI for local development by following the official [Inngest Dev Server guide](https://www.inngest.com/docs/dev-server).

## Define the Planning Agent

Define a planning agent which leverages an LLM call to plan activities given a location and corresponding weather conditions.

```ts showLineNumbers copy filename="agents/planning-agent.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

// Create a new planning agent that uses the OpenAI model
const planningAgent = new Agent({
  name: "planningAgent",
  model: openai("gpt-4o"),
  instructions: `
        You are a local activities and travel expert who excels at weather-based planning. Analyze the weather data and provide practical activity recommendations.

        📅 [Day, Month Date, Year]
        ═══════════════════════════

        🌡️ WEATHER SUMMARY
        • Conditions: [brief description]
        • Temperature: [X°C/Y°F to A°C/B°F]
        • Precipitation: [X% chance]

        🌅 MORNING ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🌞 AFTERNOON ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🏠 INDOOR ALTERNATIVES
        • [Activity Name] - [Brief description including specific venue]
          Ideal for: [weather condition that would trigger this alternative]

        ⚠️ SPECIAL CONSIDERATIONS
        • [Any relevant weather warnings, UV index, wind conditions, etc.]

        Guidelines:
        - Suggest 2-3 time-specific outdoor activities per day
        - Include 1-2 indoor backup options
        - For precipitation >50%, lead with indoor activities
        - All activities must be specific to the location
        - Include specific venues, trails, or locations
        - Consider activity intensity based on temperature
        - Keep descriptions concise but informative

        Maintain this exact formatting for consistency, using the emoji and section headers as shown.
      `,
});

export { planningAgent };
```

## Define the Activity Planner Workflow

Define the activity planner workflow with 3 steps: one to fetch the weather via a network call, one to plan activities, and another to plan only indoor activities.

```ts showLineNumbers copy filename="workflows/inngest-workflow.ts"
import { init } from "@mastra/inngest";
import { Inngest } from "inngest";
import { z } from "zod";

const { createWorkflow, createStep } = init(
  new Inngest({
    id: "mastra",
    baseUrl: `http://localhost:3000`,
  }),
);

// Helper function to convert weather codes to human-readable descriptions
function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm",
  };
  return conditions[code] || "Unknown";
}

const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string(),
});
```

#### Step 1: Fetch weather data for a given city

```ts showLineNumbers copy filename="workflows/inngest-workflow.ts"
const fetchWeather = createStep({
  id: "fetch-weather",
  description: "Fetches weather forecast for a given city",
  inputSchema: z.object({
    city: z.string(),
  }),
  outputSchema: forecastSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Trigger data not found");
    }

    // Get latitude and longitude for the city
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results: { latitude: number; longitude: number; name: string }[];
    };

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${inputData.city}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    // Fetch weather data using the coordinates
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      current: {
        time: string;
        precipitation: number;
        weathercode: number;
      };
      hourly: {
        precipitation_probability: number[];
        temperature_2m: number[];
      };
    };

    const forecast = {
      date: new Date().toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition(data.current.weathercode),
      location: name,
      precipitationChance: data.hourly.precipitation_probability.reduce(
        (acc, curr) => Math.max(acc, curr),
        0,
      ),
    };

    return forecast;
  },
});
```

#### Step 2: Suggest activities (indoor or outdoor) based on weather

```ts showLineNumbers copy filename="workflows/inngest-workflow.ts"
const planActivities = createStep({
  id: "plan-activities",
  description: "Suggests activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;

    if (!forecast) {
      throw new Error("Forecast data not found");
    }

    const prompt = `Based on the following weather forecast for ${forecast.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      `;

    const agent = mastra?.getAgent("planningAgent");
    if (!agent) {
      throw new Error("Planning agent not found");
    }

    const response = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let activitiesText = "";

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }

    return {
      activities: activitiesText,
    };
  },
});
```

#### Step 3: Suggest indoor activities only (for rainy weather)

```ts showLineNumbers copy filename="workflows/inngest-workflow.ts"
const planIndoorActivities = createStep({
  id: "plan-indoor-activities",
  description: "Suggests indoor activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;

    if (!forecast) {
      throw new Error("Forecast data not found");
    }

    const prompt = `In case it rains, plan indoor activities for ${forecast.location} on ${forecast.date}`;

    const agent = mastra?.getAgent("planningAgent");
    if (!agent) {
      throw new Error("Planning agent not found");
    }

    const response = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let activitiesText = "";

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }

    return {
      activities: activitiesText,
    };
  },
});
```

## Define the activity planner workflow

```ts showLineNumbers copy filename="workflows/inngest-workflow.ts"
const activityPlanningWorkflow = createWorkflow({
  id: "activity-planning-workflow-step2-if-else",
  inputSchema: z.object({
    city: z.string().describe("The city to get the weather for"),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
})
  .then(fetchWeather)
  .branch([
    [
      // If precipitation chance is greater than 50%, suggest indoor activities
      async ({ inputData }) => {
        return inputData?.precipitationChance > 50;
      },
      planIndoorActivities,
    ],
    [
      // Otherwise, suggest a mix of activities
      async ({ inputData }) => {
        return inputData?.precipitationChance <= 50;
      },
      planActivities,
    ],
  ]);

activityPlanningWorkflow.commit();

export { activityPlanningWorkflow };
```

## Register Agent and Workflow instances with Mastra class

Register the agents and workflow with the mastra instance. This allows access to the agents within the workflow.

```ts showLineNumbers copy filename="index.ts"
import { Mastra } from "@mastra/core/mastra";
import { serve as inngestServe } from "@mastra/inngest";
import { PinoLogger } from "@mastra/loggers";
import { Inngest } from "inngest";
import { activityPlanningWorkflow } from "./workflows/inngest-workflow";
import { planningAgent } from "./agents/planning-agent";
import { realtimeMiddleware } from "@inngest/realtime";

// Create an Inngest instance for workflow orchestration and event handling
const inngest = new Inngest({
  id: "mastra",
  baseUrl: `http://localhost:3000`, // URL of your local Inngest server
  isDev: true,
  middleware: [realtimeMiddleware()], // Enable real-time updates in the Inngest dashboard
});

// Create and configure the main Mastra instance
export const mastra = new Mastra({
  workflows: {
    activityPlanningWorkflow,
  },
  agents: {
    planningAgent,
  },
  server: {
    host: "0.0.0.0",
    apiRoutes: [
      {
        path: "/api/inngest", // API endpoint for Inngest to send events to
        method: "ALL",
        createHandler: async ({ mastra }) => inngestServe({ mastra, inngest }),
      },
    ],
  },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
```

## Execute the activity planner workflow

Here, we'll get the activity planner workflow from the mastra instance, then create a run and execute the created run with the required inputData.

```ts showLineNumbers copy filename="exec.ts"
import { mastra } from "./";
import { serve } from "@hono/node-server";
import { createHonoServer } from "@mastra/deployer/server";

const app = await createHonoServer(mastra);

// Start the server on port 3000 so Inngest can send events to it
const srv = serve({
  fetch: app.fetch,
  port: 3000,
});

const workflow = mastra.getWorkflow("activityPlanningWorkflow");
const run = await workflow.createRunAsync();

// Start the workflow with the required input data (city name)
// This will trigger the workflow steps and stream the result to the console
const result = await run.start({ inputData: { city: "New York" } });
console.dir(result, { depth: null });

// Close the server after the workflow run is complete
srv.close();
```

After running the workflow, you can view and monitor your workflow runs in real time using the Inngest dashboard at [http://localhost:3000](http://localhost:3000).

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)


---
title: "Example: Parallel Execution | Workflows | Mastra Docs"
description: Example of using Mastra to execute multiple independent tasks in parallel within a workflow.
---

# Parallel Execution with Steps
[EN] Source: https://mastra.ai/en/examples/workflows/parallel-steps

When building AI applications, you often need to process multiple independent tasks simultaneously to improve efficiency.
We make this functionality a core part of workflows through the `.parallel` method.

## Setup

```sh copy
npm install @ai-sdk/openai @mastra/core
```

## Define Planning Agent

Define a planning agent which leverages an LLM call to plan activities given a location and corresponding weather conditions.

```ts showLineNumbers copy filename="agents/planning-agent.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const llm = openai("gpt-4o");

// Define the planning agent with specific instructions for formatting
// and structuring weather-based activity recommendations
const planningAgent = new Agent({
  name: "planningAgent",
  model: llm,
  instructions: `
        You are a local activities and travel expert who excels at weather-based planning. Analyze the weather data and provide practical activity recommendations.

        📅 [Day, Month Date, Year]
        ═══════════════════════════

        🌡️ WEATHER SUMMARY
        • Conditions: [brief description]
        • Temperature: [X°C/Y°F to A°C/B°F]
        • Precipitation: [X% chance]

        🌅 MORNING ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🌞 AFTERNOON ACTIVITIES
        Outdoor:
        • [Activity Name] - [Brief description including specific location/route]
          Best timing: [specific time range]
          Note: [relevant weather consideration]

        🏠 INDOOR ALTERNATIVES
        • [Activity Name] - [Brief description including specific venue]
          Ideal for: [weather condition that would trigger this alternative]

        ⚠️ SPECIAL CONSIDERATIONS
        • [Any relevant weather warnings, UV index, wind conditions, etc.]

        Guidelines:
        - Suggest 2-3 time-specific outdoor activities per day
        - Include 1-2 indoor backup options
        - For precipitation >50%, lead with indoor activities
        - All activities must be specific to the location
        - Include specific venues, trails, or locations
        - Consider activity intensity based on temperature
        - Keep descriptions concise but informative

        Maintain this exact formatting for consistency, using the emoji and section headers as shown.
      `,
});

export { planningAgent };
```

## Define Synthesize Agent

Define a synthesize agent which takes planned indoor and outdoor activities and provides a full report on the day.

```ts showLineNumbers copy filename="agents/synthesize-agent.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const llm = openai("gpt-4o");

// Define the synthesize agent that combines indoor and outdoor activity plans
// into a comprehensive report, considering weather conditions and alternatives
const synthesizeAgent = new Agent({
  name: "synthesizeAgent",
  model: llm,
  instructions: `
  You are given two different blocks of text, one about indoor activities and one about outdoor activities.
  Make this into a full report about the day and the possibilities depending on whether it rains or not.
  `,
});

export { synthesizeAgent };
```

## Define Parallel Workflow

Here, we'll define a workflow which orchestrates a parallel -> sequential flow between the planning steps and the synthesize step.

```ts showLineNumbers copy filename="workflows/parallel-workflow.ts"
import { z } from "zod";
import { createStep, createWorkflow } from "@mastra/core/workflows";

const forecastSchema = z.object({
  date: z.string(),
  maxTemp: z.number(),
  minTemp: z.number(),
  precipitationChance: z.number(),
  condition: z.string(),
  location: z.string(),
});

// Step to fetch weather data for a given city
// Makes API calls to get current weather conditions and forecast
const fetchWeather = createStep({
  id: "fetch-weather",
  description: "Fetches weather forecast for a given city",
  inputSchema: z.object({
    city: z.string(),
  }),
  outputSchema: forecastSchema,
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error("Trigger data not found");
    }

    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.city)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results: { latitude: number; longitude: number; name: string }[];
    };

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${inputData.city}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=precipitation,weathercode&timezone=auto,&hourly=precipitation_probability,temperature_2m`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      current: {
        time: string;
        precipitation: number;
        weathercode: number;
      };
      hourly: {
        precipitation_probability: number[];
        temperature_2m: number[];
      };
    };

    const forecast = {
      date: new Date().toISOString(),
      maxTemp: Math.max(...data.hourly.temperature_2m),
      minTemp: Math.min(...data.hourly.temperature_2m),
      condition: getWeatherCondition(data.current.weathercode),
      location: name,
      precipitationChance: data.hourly.precipitation_probability.reduce(
        (acc, curr) => Math.max(acc, curr),
        0,
      ),
    };

    return forecast;
  },
});
```

### Step to plan outdoor activities based on weather conditions

Uses the planning agent to generate activity recommendations

```ts showLineNumbers copy filename="workflows/parallel-workflow.ts"
const planActivities = createStep({
  id: "plan-activities",
  description: "Suggests activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;

    if (!forecast) {
      throw new Error("Forecast data not found");
    }

    const prompt = `Based on the following weather forecast for ${forecast.location}, suggest appropriate activities:
      ${JSON.stringify(forecast, null, 2)}
      `;

    const agent = mastra?.getAgent("planningAgent");
    if (!agent) {
      throw new Error("Planning agent not found");
    }

    const response = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let activitiesText = "";

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }
    return {
      activities: activitiesText,
    };
  },
});
```

### Helper function to convert weather codes to human-readable conditions

Maps numeric codes from the weather API to descriptive strings

```ts showLineNumbers copy filename="workflows/parallel-workflow.ts"
function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    95: "Thunderstorm",
  };
  return conditions[code] || "Unknown";
}

// Step to plan indoor activities as backup options
// Generates alternative indoor activities in case of bad weather
const planIndoorActivities = createStep({
  id: "plan-indoor-activities",
  description: "Suggests indoor activities based on weather conditions",
  inputSchema: forecastSchema,
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const forecast = inputData;

    if (!forecast) {
      throw new Error("Forecast data not found");
    }

    const prompt = `In case it rains, plan indoor activities for ${forecast.location} on ${forecast.date}`;

    const agent = mastra?.getAgent("planningAgent");
    if (!agent) {
      throw new Error("Planning agent not found");
    }

    const response = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let activitiesText = "";

    for await (const chunk of response.textStream) {
      activitiesText += chunk;
    }
    return {
      activities: activitiesText,
    };
  },
});
```

### Step to synthesize and combine indoor/outdoor activity plans

Creates a comprehensive plan that considers both options

```ts showLineNumbers copy filename="workflows/parallel-workflow.ts"
const synthesizeStep = createStep({
  id: "sythesize-step",
  description: "Synthesizes the results of the indoor and outdoor activities",
  inputSchema: z.object({
    "plan-activities": z.object({
      activities: z.string(),
    }),
    "plan-indoor-activities": z.object({
      activities: z.string(),
    }),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const indoorActivities = inputData?.["plan-indoor-activities"];
    const outdoorActivities = inputData?.["plan-activities"];

    const prompt = `Indoor activities:
      ${indoorActivities?.activities}

      Outdoor activities:
      ${outdoorActivities?.activities}

      There is a chance of rain so be prepared to do indoor activities if needed.`;

    const agent = mastra?.getAgent("synthesizeAgent");
    if (!agent) {
      throw new Error("Synthesize agent not found");
    }

    const response = await agent.stream([
      {
        role: "user",
        content: prompt,
      },
    ]);

    let activitiesText = "";

    for await (const chunk of response.textStream) {
      process.stdout.write(chunk);
      activitiesText += chunk;
    }

    return {
      activities: activitiesText,
    };
  },
});
```

### Main workflow

```ts showLineNumbers copy filename="workflows/parallel-workflow.ts"
const activityPlanningWorkflow = createWorkflow({
  id: "plan-both-workflow",
  inputSchema: z.object({
    city: z.string(),
  }),
  outputSchema: z.object({
    activities: z.string(),
  }),
  steps: [fetchWeather, planActivities, planIndoorActivities, synthesizeStep],
})
  .then(fetchWeather)
  .parallel([planActivities, planIndoorActivities])
  .then(synthesizeStep)
  .commit();

export { activityPlanningWorkflow };
```

## Register Agent and Workflow instances with Mastra class

Register the agents and workflow with the mastra instance.
This is critical for enabling access to the agents within the workflow.

```ts showLineNumbers copy filename="index.ts"
import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";
import { activityPlanningWorkflow } from "./workflows/parallel-workflow";
import { planningAgent } from "./agents/planning-agent";
import { synthesizeAgent } from "./agents/synthesize-agent";

// Initialize Mastra with required agents and workflows
// This setup enables agent access within the workflow steps
const mastra = new Mastra({
  workflows: {
    activityPlanningWorkflow,
  },
  agents: {
    planningAgent,
    synthesizeAgent,
  },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});

export { mastra };
```

## Execute the activity planning workflow

Here, we'll get the weather workflow from the mastra instance, then create a run and execute the created run with the required inputData.

```ts showLineNumbers copy filename="exec.ts"
import { mastra } from "./";

const workflow = mastra.getWorkflow("activityPlanningWorkflow");
const run = await workflow.createRunAsync();

// Execute the workflow with a specific city
// This will run through all steps and generate activity recommendations
const result = await run.start({ inputData: { city: "Ibiza" } });
console.dir(result, { depth: null });
```

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)



---
title: "Example: Branching Paths | Workflows (Legacy) | Mastra Docs"
description: Example of using Mastra to create legacy workflows with branching paths based on intermediate results.
---

import { GithubLink } from "@/components/github-link";

# Branching Paths
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/branching-paths

When processing data, you often need to take different actions based on intermediate results. This example shows how to create a legacy workflow that splits into separate paths, where each path executes different steps based on the output of a previous step.

## Control Flow Diagram

This example shows how to create a legacy workflow that splits into separate paths, where each path executes different steps based on the output of a previous step.

Here's the control flow diagram:

<img
  src="/subscribed-chains.png"
  alt="Diagram showing workflow with branching paths"
/>

## Creating the Steps

Let's start by creating the steps and initializing the workflow.

{/* prettier-ignore */}
```ts showLineNumbers copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod"

const stepOne = new LegacyStep({
  id: "stepOne",
  execute: async ({ context }) => ({
    doubledValue: context.triggerData.inputValue * 2
  })
});

const stepTwo = new LegacyStep({
  id: "stepTwo",
  execute: async ({ context }) => {
    const stepOneResult = context.getStepResult<{ doubledValue: number }>("stepOne");
    if (!stepOneResult) {
      return { isDivisibleByFive: false }
    }

    return { isDivisibleByFive: stepOneResult.doubledValue % 5 === 0 }
  }
});


const stepThree = new LegacyStep({
  id: "stepThree",
  execute: async ({ context }) =>{
    const stepOneResult = context.getStepResult<{ doubledValue: number }>("stepOne");
    if (!stepOneResult) {
      return { incrementedValue: 0 }
    }

    return { incrementedValue: stepOneResult.doubledValue + 1 }
  }
});

const stepFour = new LegacyStep({
  id: "stepFour",
  execute: async ({ context }) => {
    const stepThreeResult = context.getStepResult<{ incrementedValue: number }>("stepThree");
    if (!stepThreeResult) {
      return { isDivisibleByThree: false }
    }

    return { isDivisibleByThree: stepThreeResult.incrementedValue % 3 === 0 }
  }
});

// New step that depends on both branches
const finalStep = new LegacyStep({
  id: "finalStep",
  execute: async ({ context }) => {
    // Get results from both branches using getStepResult
    const stepTwoResult = context.getStepResult<{ isDivisibleByFive: boolean }>("stepTwo");
    const stepFourResult = context.getStepResult<{ isDivisibleByThree: boolean }>("stepFour");

    const isDivisibleByFive = stepTwoResult?.isDivisibleByFive || false;
    const isDivisibleByThree = stepFourResult?.isDivisibleByThree || false;

    return {
      summary: `The number ${context.triggerData.inputValue} when doubled ${isDivisibleByFive ? 'is' : 'is not'} divisible by 5, and when doubled and incremented ${isDivisibleByThree ? 'is' : 'is not'} divisible by 3.`,
      isDivisibleByFive,
      isDivisibleByThree
    }
  }
});

// Build the workflow
const myWorkflow = new LegacyWorkflow({
  name: "my-workflow",
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});
```

## Branching Paths and Chaining Steps

Now let's configure the legacy workflow with branching paths and merge them using the compound `.after([])` syntax.

```ts showLineNumbers copy
// Create two parallel branches
myWorkflow
  // First branch
  .step(stepOne)
  .then(stepTwo)

  // Second branch
  .after(stepOne)
  .step(stepThree)
  .then(stepFour)

  // Merge both branches using compound after syntax
  .after([stepTwo, stepFour])
  .step(finalStep)
  .commit();

const { start } = myWorkflow.createRun();

const result = await start({ triggerData: { inputValue: 3 } });
console.log(result.steps.finalStep.output.summary);
// Output: "The number 3 when doubled is not divisible by 5, and when doubled and incremented is divisible by 3."
```

## Advanced Branching and Merging

You can create more complex workflows with multiple branches and merge points:

```ts showLineNumbers copy
const complexWorkflow = new LegacyWorkflow({
  name: "complex-workflow",
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});

// Create multiple branches with different merge points
complexWorkflow
  // Main step
  .step(stepOne)

  // First branch
  .then(stepTwo)

  // Second branch
  .after(stepOne)
  .step(stepThree)
  .then(stepFour)

  // Third branch (another path from stepOne)
  .after(stepOne)
  .step(
    new LegacyStep({
      id: "alternativePath",
      execute: async ({ context }) => {
        const stepOneResult = context.getStepResult<{ doubledValue: number }>(
          "stepOne",
        );
        return {
          result: (stepOneResult?.doubledValue || 0) * 3,
        };
      },
    }),
  )

  // Merge first and second branches
  .after([stepTwo, stepFour])
  .step(
    new LegacyStep({
      id: "partialMerge",
      execute: async ({ context }) => {
        const stepTwoResult = context.getStepResult<{
          isDivisibleByFive: boolean;
        }>("stepTwo");
        const stepFourResult = context.getStepResult<{
          isDivisibleByThree: boolean;
        }>("stepFour");

        return {
          intermediateResult: "Processed first two branches",
          branchResults: {
            branch1: stepTwoResult?.isDivisibleByFive,
            branch2: stepFourResult?.isDivisibleByThree,
          },
        };
      },
    }),
  )

  // Final merge of all branches
  .after(["partialMerge", "alternativePath"])
  .step(
    new LegacyStep({
      id: "finalMerge",
      execute: async ({ context }) => {
        const partialMergeResult = context.getStepResult<{
          intermediateResult: string;
          branchResults: { branch1: boolean; branch2: boolean };
        }>("partialMerge");

        const alternativePathResult = context.getStepResult<{ result: number }>(
          "alternativePath",
        );

        return {
          finalResult: "All branches processed",
          combinedData: {
            fromPartialMerge: partialMergeResult?.branchResults,
            fromAlternativePath: alternativePathResult?.result,
          },
        };
      },
    }),
  )
  .commit();
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/workflows-legacy/workflow-with-branching-paths"
  }
/>
`

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Example: Calling an Agent from a Workflow (Legacy) | Mastra Docs"
description: Example of using Mastra to call an AI agent from within a legacy workflow step.
---

import { GithubLink } from "@/components/github-link";

# Calling an Agent From a Workflow (Legacy)
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/calling-agent

This example demonstrates how to create a legacy workflow that calls an AI agent to process messages and generate responses, and execute it within a legacy workflow step.

```ts showLineNumbers copy
import { openai } from "@ai-sdk/openai";
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const penguin = new Agent({
  name: "agent skipper",
  instructions: `You are skipper from penguin of madagascar, reply as that`,
  model: openai("gpt-4o-mini"),
});

const newWorkflow = new LegacyWorkflow({
  name: "pass message to the workflow",
  triggerSchema: z.object({
    message: z.string(),
  }),
});

const replyAsSkipper = new LegacyStep({
  id: "reply",
  outputSchema: z.object({
    reply: z.string(),
  }),
  execute: async ({ context, mastra }) => {
    const skipper = mastra?.getAgent("penguin");

    const res = await skipper?.generate(context?.triggerData?.message);
    return { reply: res?.text || "" };
  },
});

newWorkflow.step(replyAsSkipper);
newWorkflow.commit();

const mastra = new Mastra({
  agents: { penguin },
  legacy_workflows: { newWorkflow },
});

const { runId, start } = await mastra
  .legacy_getWorkflow("newWorkflow")
  .createRun();

const runResult = await start({
  triggerData: { message: "Give me a run down of the mission to save private" },
});

console.log(runResult.results);
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/workflows-legacy/calling-agent-from-workflow"
  }
/>

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Example: Conditional Branching (experimental) | Workflows (Legacy) | Mastra Docs"
description: Example of using Mastra to create conditional branches in legacy workflows using if/else statements.
---

import { GithubLink } from "@/components/github-link";

# Workflow (Legacy) with Conditional Branching (experimental)
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/conditional-branching

Workflows often need to follow different paths based on conditions. This example demonstrates how to use `if` and `else` to create conditional branches in your legacy workflows.

## Basic If/Else Example

This example shows a simple legacy workflow that takes different paths based on a numeric value:

```ts showLineNumbers copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Step that provides the initial value
const startStep = new LegacyStep({
  id: "start",
  outputSchema: z.object({
    value: z.number(),
  }),
  execute: async ({ context }) => {
    // Get the value from the trigger data
    const value = context.triggerData.inputValue;
    return { value };
  },
});

// Step that handles high values
const highValueStep = new LegacyStep({
  id: "highValue",
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ context }) => {
    const value = context.getStepResult<{ value: number }>("start")?.value;
    return { result: `High value processed: ${value}` };
  },
});

// Step that handles low values
const lowValueStep = new LegacyStep({
  id: "lowValue",
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ context }) => {
    const value = context.getStepResult<{ value: number }>("start")?.value;
    return { result: `Low value processed: ${value}` };
  },
});

// Final step that summarizes the result
const finalStep = new LegacyStep({
  id: "final",
  outputSchema: z.object({
    summary: z.string(),
  }),
  execute: async ({ context }) => {
    // Get the result from whichever branch executed
    const highResult = context.getStepResult<{ result: string }>(
      "highValue",
    )?.result;
    const lowResult = context.getStepResult<{ result: string }>(
      "lowValue",
    )?.result;

    const result = highResult || lowResult;
    return { summary: `Processing complete: ${result}` };
  },
});

// Build the workflow with conditional branching
const conditionalWorkflow = new LegacyWorkflow({
  name: "conditional-workflow",
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});

conditionalWorkflow
  .step(startStep)
  .if(async ({ context }) => {
    const value = context.getStepResult<{ value: number }>("start")?.value ?? 0;
    return value >= 10; // Condition: value is 10 or greater
  })
  .then(highValueStep)
  .then(finalStep)
  .else()
  .then(lowValueStep)
  .then(finalStep) // Both branches converge on the final step
  .commit();

// Register the workflow
const mastra = new Mastra({
  legacy_workflows: { conditionalWorkflow },
});

// Example usage
async function runWorkflow(inputValue: number) {
  const workflow = mastra.legacy_getWorkflow("conditionalWorkflow");
  const { start } = workflow.createRun();

  const result = await start({
    triggerData: { inputValue },
  });

  console.log("Workflow result:", result.results);
  return result;
}

// Run with a high value (follows the "if" branch)
const result1 = await runWorkflow(15);
// Run with a low value (follows the "else" branch)
const result2 = await runWorkflow(5);

console.log("Result 1:", result1);
console.log("Result 2:", result2);
```

## Using Reference-Based Conditions

You can also use reference-based conditions with comparison operators:

```ts showLineNumbers copy
// Using reference-based conditions instead of functions
conditionalWorkflow
  .step(startStep)
  .if({
    ref: { step: startStep, path: "value" },
    query: { $gte: 10 }, // Condition: value is 10 or greater
  })
  .then(highValueStep)
  .then(finalStep)
  .else()
  .then(lowValueStep)
  .then(finalStep)
  .commit();
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/workflows-legacy/conditional-branching"
  }
/>

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Example: Creating a Workflow | Workflows (Legacy) | Mastra Docs"
description: Example of using Mastra to define and execute a simple workflow with a single step.
---

import { GithubLink } from "@/components/github-link";

# Creating a Simple Workflow (Legacy)
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/creating-a-workflow

A workflow allows you to define and execute sequences of operations in a structured path. This example shows a legacy workflow with a single step.

```ts showLineNumbers copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const myWorkflow = new LegacyWorkflow({
  name: "my-workflow",
  triggerSchema: z.object({
    input: z.number(),
  }),
});

const stepOne = new LegacyStep({
  id: "stepOne",
  inputSchema: z.object({
    value: z.number(),
  }),
  outputSchema: z.object({
    doubledValue: z.number(),
  }),
  execute: async ({ context }) => {
    const doubledValue = context?.triggerData?.input * 2;
    return { doubledValue };
  },
});

myWorkflow.step(stepOne).commit();

const { runId, start } = myWorkflow.createRun();

const res = await start({
  triggerData: { input: 90 },
});

console.log(res.results);
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/workflows-legacy/create-workflow"
  }
/>

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Example: Cyclical Dependencies | Workflows (Legacy) | Mastra Docs"
description: Example of using Mastra to create legacy workflows with cyclical dependencies and conditional loops.
---

import { GithubLink } from "@/components/github-link";

# Workflow (Legacy) with Cyclical dependencies
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/cyclical-dependencies

Workflows support cyclical dependencies where steps can loop back based on conditions. The example below shows how to use conditional logic to create loops and handle repeated execution.

```ts showLineNumbers copy
import { LegacyWorkflow, LegacyStep } from "@mastra/core/workflows/legacy";
import { z } from "zod";

async function main() {
  const doubleValue = new LegacyStep({
    id: "doubleValue",
    description: "Doubles the input value",
    inputSchema: z.object({
      inputValue: z.number(),
    }),
    outputSchema: z.object({
      doubledValue: z.number(),
    }),
    execute: async ({ context }) => {
      const doubledValue = context.inputValue * 2;
      return { doubledValue };
    },
  });

  const incrementByOne = new LegacyStep({
    id: "incrementByOne",
    description: "Adds 1 to the input value",
    outputSchema: z.object({
      incrementedValue: z.number(),
    }),
    execute: async ({ context }) => {
      const valueToIncrement = context?.getStepResult<{ firstValue: number }>(
        "trigger",
      )?.firstValue;
      if (!valueToIncrement) throw new Error("No value to increment provided");
      const incrementedValue = valueToIncrement + 1;
      return { incrementedValue };
    },
  });

  const cyclicalWorkflow = new LegacyWorkflow({
    name: "cyclical-workflow",
    triggerSchema: z.object({
      firstValue: z.number(),
    }),
  });

  cyclicalWorkflow
    .step(doubleValue, {
      variables: {
        inputValue: {
          step: "trigger",
          path: "firstValue",
        },
      },
    })
    .then(incrementByOne)
    .after(doubleValue)
    .step(doubleValue, {
      variables: {
        inputValue: {
          step: doubleValue,
          path: "doubledValue",
        },
      },
    })
    .commit();

  const { runId, start } = cyclicalWorkflow.createRun();

  console.log("Run", runId);

  const res = await start({ triggerData: { firstValue: 6 } });

  console.log(res.results);
}

main();
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/workflows-legacy/workflow-with-cyclical-deps"
  }
/>

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Example: Human in the Loop | Workflows (Legacy) | Mastra Docs"
description: Example of using Mastra to create legacy workflows with human intervention points.
---

import { GithubLink } from "@/components/github-link";

# Human in the Loop Workflow (Legacy)
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/human-in-the-loop

Human-in-the-loop workflows allow you to pause execution at specific points to collect user input, make decisions, or perform actions that require human judgment. This example demonstrates how to create a legacy workflow with human intervention points.

## How It Works

1. A workflow step can **suspend** execution using the `suspend()` function, optionally passing a payload with context for the human decision maker.
2. When the workflow is **resumed**, the human input is passed in the `context` parameter of the `resume()` call.
3. This input becomes available in the step's execution context as `context.inputData`, which is typed according to the step's `inputSchema`.
4. The step can then continue execution based on the human input.

This pattern allows for safe, type-checked human intervention in automated workflows.

## Interactive Terminal Example Using Inquirer

This example demonstrates how to use the [Inquirer](https://www.npmjs.com/package/@inquirer/prompts) library to collect user input directly from the terminal when a workflow is suspended, creating a truly interactive human-in-the-loop experience.

```ts showLineNumbers copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";
import { confirm, input, select } from "@inquirer/prompts";

// Step 1: Generate product recommendations
const generateRecommendations = new LegacyStep({
  id: "generateRecommendations",
  outputSchema: z.object({
    customerName: z.string(),
    recommendations: z.array(
      z.object({
        productId: z.string(),
        productName: z.string(),
        price: z.number(),
        description: z.string(),
      }),
    ),
  }),
  execute: async ({ context }) => {
    const customerName = context.triggerData.customerName;

    // In a real application, you might call an API or ML model here
    // For this example, we'll return mock data
    return {
      customerName,
      recommendations: [
        {
          productId: "prod-001",
          productName: "Premium Widget",
          price: 99.99,
          description: "Our best-selling premium widget with advanced features",
        },
        {
          productId: "prod-002",
          productName: "Basic Widget",
          price: 49.99,
          description: "Affordable entry-level widget for beginners",
        },
        {
          productId: "prod-003",
          productName: "Widget Pro Plus",
          price: 149.99,
          description: "Professional-grade widget with extended warranty",
        },
      ],
    };
  },
});
```

```ts showLineNumbers copy
// Step 2: Get human approval and customization for the recommendations
const reviewRecommendations = new LegacyStep({
  id: "reviewRecommendations",
  inputSchema: z.object({
    approvedProducts: z.array(z.string()),
    customerNote: z.string().optional(),
    offerDiscount: z.boolean().optional(),
  }),
  outputSchema: z.object({
    finalRecommendations: z.array(
      z.object({
        productId: z.string(),
        productName: z.string(),
        price: z.number(),
      }),
    ),
    customerNote: z.string().optional(),
    offerDiscount: z.boolean(),
  }),
  execute: async ({ context, suspend }) => {
    const { customerName, recommendations } = context.getStepResult(
      generateRecommendations,
    ) || {
      customerName: "",
      recommendations: [],
    };

    // Check if we have input from a resumed workflow
    const reviewInput = {
      approvedProducts: context.inputData?.approvedProducts || [],
      customerNote: context.inputData?.customerNote,
      offerDiscount: context.inputData?.offerDiscount,
    };

    // If we don't have agent input yet, suspend for human review
    if (!reviewInput.approvedProducts.length) {
      console.log(`Generating recommendations for customer: ${customerName}`);
      await suspend({
        customerName,
        recommendations,
        message:
          "Please review these product recommendations before sending to the customer",
      });

      // Placeholder return (won't be reached due to suspend)
      return {
        finalRecommendations: [],
        customerNote: "",
        offerDiscount: false,
      };
    }

    // Process the agent's product selections
    const finalRecommendations = recommendations
      .filter((product) =>
        reviewInput.approvedProducts.includes(product.productId),
      )
      .map((product) => ({
        productId: product.productId,
        productName: product.productName,
        price: product.price,
      }));

    return {
      finalRecommendations,
      customerNote: reviewInput.customerNote || "",
      offerDiscount: reviewInput.offerDiscount || false,
    };
  },
});
```

```ts showLineNumbers copy
// Step 3: Send the recommendations to the customer
const sendRecommendations = new LegacyStep({
  id: "sendRecommendations",
  outputSchema: z.object({
    emailSent: z.boolean(),
    emailContent: z.string(),
  }),
  execute: async ({ context }) => {
    const { customerName } = context.getStepResult(generateRecommendations) || {
      customerName: "",
    };
    const { finalRecommendations, customerNote, offerDiscount } =
      context.getStepResult(reviewRecommendations) || {
        finalRecommendations: [],
        customerNote: "",
        offerDiscount: false,
      };

    // Generate email content based on the recommendations
    let emailContent = `Dear ${customerName},\n\nBased on your preferences, we recommend:\n\n`;

    finalRecommendations.forEach((product) => {
      emailContent += `- ${product.productName}: $${product.price.toFixed(2)}\n`;
    });

    if (offerDiscount) {
      emailContent +=
        "\nAs a valued customer, use code SAVE10 for 10% off your next purchase!\n";
    }

    if (customerNote) {
      emailContent += `\nPersonal note: ${customerNote}\n`;
    }

    emailContent += "\nThank you for your business,\nThe Sales Team";

    // In a real application, you would send this email
    console.log("Email content generated:", emailContent);

    return {
      emailSent: true,
      emailContent,
    };
  },
});

// Build the workflow
const recommendationWorkflow = new LegacyWorkflow({
  name: "product-recommendation-workflow",
  triggerSchema: z.object({
    customerName: z.string(),
  }),
});

recommendationWorkflow
  .step(generateRecommendations)
  .then(reviewRecommendations)
  .then(sendRecommendations)
  .commit();

// Register the workflow
const mastra = new Mastra({
  legacy_workflows: { recommendationWorkflow },
});
```

```ts showLineNumbers copy
// Example of using the workflow with Inquirer prompts
async function runRecommendationWorkflow() {
  const registeredWorkflow = mastra.legacy_getWorkflow(
    "recommendationWorkflow",
  );
  const run = registeredWorkflow.createRun();

  console.log("Starting product recommendation workflow...");
  const result = await run.start({
    triggerData: {
      customerName: "Jane Smith",
    },
  });

  const isReviewStepSuspended =
    result.activePaths.get("reviewRecommendations")?.status === "suspended";

  // Check if workflow is suspended for human review
  if (isReviewStepSuspended) {
    const { customerName, recommendations, message } = result.activePaths.get(
      "reviewRecommendations",
    )?.suspendPayload;

    console.log("\n===================================");
    console.log(message);
    console.log(`Customer: ${customerName}`);
    console.log("===================================\n");

    // Use Inquirer to collect input from the sales agent in the terminal
    console.log("Available product recommendations:");
    recommendations.forEach((product, index) => {
      console.log(
        `${index + 1}. ${product.productName} - $${product.price.toFixed(2)}`,
      );
      console.log(`   ${product.description}\n`);
    });

    // Let the agent select which products to recommend
    const approvedProducts = await checkbox({
      message: "Select products to recommend to the customer:",
      choices: recommendations.map((product) => ({
        name: `${product.productName} ($${product.price.toFixed(2)})`,
        value: product.productId,
      })),
    });

    // Let the agent add a personal note
    const includeNote = await confirm({
      message: "Would you like to add a personal note?",
      default: false,
    });

    let customerNote = "";
    if (includeNote) {
      customerNote = await input({
        message: "Enter your personalized note for the customer:",
      });
    }

    // Ask if a discount should be offered
    const offerDiscount = await confirm({
      message: "Offer a 10% discount to this customer?",
      default: false,
    });

    console.log("\nSubmitting your review...");

    // Resume the workflow with the agent's input
    const resumeResult = await run.resume({
      stepId: "reviewRecommendations",
      context: {
        approvedProducts,
        customerNote,
        offerDiscount,
      },
    });

    console.log("\n===================================");
    console.log("Workflow completed!");
    console.log("Email content:");
    console.log("===================================\n");
    console.log(
      resumeResult?.results?.sendRecommendations ||
        "No email content generated",
    );

    return resumeResult;
  }

  return result;
}

// Invoke the workflow with interactive terminal input
runRecommendationWorkflow().catch(console.error);
```

## Advanced Example with Multiple User Inputs

This example demonstrates a more complex workflow that requires multiple human intervention points, such as in a content moderation system.

```ts showLineNumbers copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";
import { select, input } from "@inquirer/prompts";

// Step 1: Receive and analyze content
const analyzeContent = new LegacyStep({
  id: "analyzeContent",
  outputSchema: z.object({
    content: z.string(),
    aiAnalysisScore: z.number(),
    flaggedCategories: z.array(z.string()).optional(),
  }),
  execute: async ({ context }) => {
    const content = context.triggerData.content;

    // Simulate AI analysis
    const aiAnalysisScore = simulateContentAnalysis(content);
    const flaggedCategories =
      aiAnalysisScore < 0.7
        ? ["potentially inappropriate", "needs review"]
        : [];

    return {
      content,
      aiAnalysisScore,
      flaggedCategories,
    };
  },
});
```

```ts showLineNumbers copy
// Step 2: Moderate content that needs review
const moderateContent = new LegacyStep({
  id: "moderateContent",
  // Define the schema for human input that will be provided when resuming
  inputSchema: z.object({
    moderatorDecision: z.enum(["approve", "reject", "modify"]).optional(),
    moderatorNotes: z.string().optional(),
    modifiedContent: z.string().optional(),
  }),
  outputSchema: z.object({
    moderationResult: z.enum(["approved", "rejected", "modified"]),
    moderatedContent: z.string(),
    notes: z.string().optional(),
  }),
  // @ts-ignore
  execute: async ({ context, suspend }) => {
    const analysisResult = context.getStepResult(analyzeContent);
    // Access the input provided when resuming the workflow
    const moderatorInput = {
      decision: context.inputData?.moderatorDecision,
      notes: context.inputData?.moderatorNotes,
      modifiedContent: context.inputData?.modifiedContent,
    };

    // If the AI analysis score is high enough, auto-approve
    if (
      analysisResult?.aiAnalysisScore > 0.9 &&
      !analysisResult?.flaggedCategories?.length
    ) {
      return {
        moderationResult: "approved",
        moderatedContent: analysisResult.content,
        notes: "Auto-approved by system",
      };
    }

    // If we don't have moderator input yet, suspend for human review
    if (!moderatorInput.decision) {
      await suspend({
        content: analysisResult?.content,
        aiScore: analysisResult?.aiAnalysisScore,
        flaggedCategories: analysisResult?.flaggedCategories,
        message: "Please review this content and make a moderation decision",
      });

      // Placeholder return
      return {
        moderationResult: "approved",
        moderatedContent: "",
      };
    }

    // Process the moderator's decision
    switch (moderatorInput.decision) {
      case "approve":
        return {
          moderationResult: "approved",
          moderatedContent: analysisResult?.content || "",
          notes: moderatorInput.notes || "Approved by moderator",
        };

      case "reject":
        return {
          moderationResult: "rejected",
          moderatedContent: "",
          notes: moderatorInput.notes || "Rejected by moderator",
        };

      case "modify":
        return {
          moderationResult: "modified",
          moderatedContent:
            moderatorInput.modifiedContent || analysisResult?.content || "",
          notes: moderatorInput.notes || "Modified by moderator",
        };

      default:
        return {
          moderationResult: "rejected",
          moderatedContent: "",
          notes: "Invalid moderator decision",
        };
    }
  },
});
```

```ts showLineNumbers copy
// Step 3: Apply moderation actions
const applyModeration = new LegacyStep({
  id: "applyModeration",
  outputSchema: z.object({
    finalStatus: z.string(),
    content: z.string().optional(),
    auditLog: z.object({
      originalContent: z.string(),
      moderationResult: z.string(),
      aiScore: z.number(),
      timestamp: z.string(),
    }),
  }),
  execute: async ({ context }) => {
    const analysisResult = context.getStepResult(analyzeContent);
    const moderationResult = context.getStepResult(moderateContent);

    // Create audit log
    const auditLog = {
      originalContent: analysisResult?.content || "",
      moderationResult: moderationResult?.moderationResult || "unknown",
      aiScore: analysisResult?.aiAnalysisScore || 0,
      timestamp: new Date().toISOString(),
    };

    // Apply moderation action
    switch (moderationResult?.moderationResult) {
      case "approved":
        return {
          finalStatus: "Content published",
          content: moderationResult.moderatedContent,
          auditLog,
        };

      case "modified":
        return {
          finalStatus: "Content modified and published",
          content: moderationResult.moderatedContent,
          auditLog,
        };

      case "rejected":
        return {
          finalStatus: "Content rejected",
          auditLog,
        };

      default:
        return {
          finalStatus: "Error in moderation process",
          auditLog,
        };
    }
  },
});
```

```ts showLineNumbers copy
// Build the workflow
const contentModerationWorkflow = new LegacyWorkflow({
  name: "content-moderation-workflow",
  triggerSchema: z.object({
    content: z.string(),
  }),
});

contentModerationWorkflow
  .step(analyzeContent)
  .then(moderateContent)
  .then(applyModeration)
  .commit();

// Register the workflow
const mastra = new Mastra({
  legacy_workflows: { contentModerationWorkflow },
});

// Example of using the workflow with Inquirer prompts
async function runModerationDemo() {
  const registeredWorkflow = mastra.legacy_getWorkflow(
    "contentModerationWorkflow",
  );
  const run = registeredWorkflow.createRun();

  // Start the workflow with content that needs review
  console.log("Starting content moderation workflow...");
  const result = await run.start({
    triggerData: {
      content: "This is some user-generated content that requires moderation.",
    },
  });

  const isReviewStepSuspended =
    result.activePaths.get("moderateContent")?.status === "suspended";

  // Check if workflow is suspended
  if (isReviewStepSuspended) {
    const { content, aiScore, flaggedCategories, message } =
      result.activePaths.get("moderateContent")?.suspendPayload;

    console.log("\n===================================");
    console.log(message);
    console.log("===================================\n");

    console.log("Content to review:");
    console.log(content);
    console.log(`\nAI Analysis Score: ${aiScore}`);
    console.log(
      `Flagged Categories: ${flaggedCategories?.join(", ") || "None"}\n`,
    );

    // Collect moderator decision using Inquirer
    const moderatorDecision = await select({
      message: "Select your moderation decision:",
      choices: [
        { name: "Approve content as is", value: "approve" },
        { name: "Reject content completely", value: "reject" },
        { name: "Modify content before publishing", value: "modify" },
      ],
    });

    // Collect additional information based on decision
    let moderatorNotes = "";
    let modifiedContent = "";

    moderatorNotes = await input({
      message: "Enter any notes about your decision:",
    });

    if (moderatorDecision === "modify") {
      modifiedContent = await input({
        message: "Enter the modified content:",
        default: content,
      });
    }

    console.log("\nSubmitting your moderation decision...");

    // Resume the workflow with the moderator's input
    const resumeResult = await run.resume({
      stepId: "moderateContent",
      context: {
        moderatorDecision,
        moderatorNotes,
        modifiedContent,
      },
    });

    if (resumeResult?.results?.applyModeration?.status === "success") {
      console.log("\n===================================");
      console.log(
        `Moderation complete: ${resumeResult?.results?.applyModeration?.output.finalStatus}`,
      );
      console.log("===================================\n");

      if (resumeResult?.results?.applyModeration?.output.content) {
        console.log("Published content:");
        console.log(resumeResult.results.applyModeration.output.content);
      }
    }

    return resumeResult;
  }

  console.log(
    "Workflow completed without requiring human intervention:",
    result.results,
  );
  return result;
}

// Helper function for AI content analysis simulation
function simulateContentAnalysis(content: string): number {
  // In a real application, this would call an AI service
  // For the example, we're returning a random score
  return Math.random();
}

// Invoke the demo function
runModerationDemo().catch(console.error);
```

## Key Concepts

1. **Suspension Points** - Use the `suspend()` function within a step's execute to pause workflow execution.

2. **Suspension Payload** - Pass relevant data when suspending to provide context for human decision-making:

```ts
await suspend({
  messageForHuman: "Please review this data",
  data: someImportantData,
});
```

3. **Checking Workflow Status** - After starting a workflow, check the returned status to see if it's suspended:

```ts
const result = await workflow.start({ triggerData });
if (result.status === "suspended" && result.suspendedStepId === "stepId") {
  // Process suspension
  console.log("Workflow is waiting for input:", result.suspendPayload);
}
```

4. **Interactive Terminal Input** - Use libraries like Inquirer to create interactive prompts:

```ts
import { select, input, confirm } from "@inquirer/prompts";

// When the workflow is suspended
if (result.status === "suspended") {
  // Display information from the suspend payload
  console.log(result.suspendPayload.message);

  // Collect user input interactively
  const decision = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Approve", value: "approve" },
      { name: "Reject", value: "reject" },
    ],
  });

  // Resume the workflow with the collected input
  await run.resume({
    stepId: result.suspendedStepId,
    context: { decision },
  });
}
```

5. **Resuming Workflow** - Use the `resume()` method to continue workflow execution with human input:

```ts
const resumeResult = await run.resume({
  stepId: "suspendedStepId",
  context: {
    // This data is passed to the suspended step as context.inputData
    // and must conform to the step's inputSchema
    userDecision: "approve",
  },
});
```

6. **Input Schema for Human Data** - Define an input schema on steps that might be resumed with human input to ensure type safety:

```ts
const myStep = new LegacyStep({
  id: "myStep",
  inputSchema: z.object({
    // This schema validates the data passed in resume's context
    // and makes it available as context.inputData
    userDecision: z.enum(["approve", "reject"]),
    userComments: z.string().optional(),
  }),
  execute: async ({ context, suspend }) => {
    // Check if we have user input from a previous suspension
    if (context.inputData?.userDecision) {
      // Process the user's decision
      return { result: `User decided: ${context.inputData.userDecision}` };
    }

    // If no input, suspend for human decision
    await suspend();
  },
});
```

Human-in-the-loop workflows are powerful for building systems that blend automation with human judgment, such as:

- Content moderation systems
- Approval workflows
- Supervised AI systems
- Customer service automation with escalation

<br />
<br />
<hr className={"dark:border-[#404040] border-gray-300"} />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/workflows-legacy/human-in-the-loop"
  }
/>

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Example: Parallel Execution | Workflows (Legacy) | Mastra Docs"
description: Example of using Mastra to execute multiple independent tasks in parallel within a workflow.
---

import { GithubLink } from "@/components/github-link";

# Parallel Execution with Steps
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/parallel-steps

When building AI applications, you often need to process multiple independent tasks simultaneously to improve efficiency.

## Control Flow Diagram

This example shows how to structure a workflow that executes steps in parallel, with each branch handling its own data flow and dependencies.

Here's the control flow diagram:

<img
  src="/parallel-chains.png"
  alt="Diagram showing workflow with parallel steps"
  width={600}
/>

## Creating the Steps

Let's start by creating the steps and initializing the workflow.

```ts showLineNumbers copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const stepOne = new LegacyStep({
  id: "stepOne",
  execute: async ({ context }) => ({
    doubledValue: context.triggerData.inputValue * 2,
  }),
});

const stepTwo = new LegacyStep({
  id: "stepTwo",
  execute: async ({ context }) => {
    if (context.steps.stepOne.status !== "success") {
      return { incrementedValue: 0 };
    }

    return { incrementedValue: context.steps.stepOne.output.doubledValue + 1 };
  },
});

const stepThree = new LegacyStep({
  id: "stepThree",
  execute: async ({ context }) => ({
    tripledValue: context.triggerData.inputValue * 3,
  }),
});

const stepFour = new LegacyStep({
  id: "stepFour",
  execute: async ({ context }) => {
    if (context.steps.stepThree.status !== "success") {
      return { isEven: false };
    }

    return { isEven: context.steps.stepThree.output.tripledValue % 2 === 0 };
  },
});

const myWorkflow = new LegacyWorkflow({
  name: "my-workflow",
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});
```

## Chaining and Parallelizing Steps

Now we can add the steps to the workflow. Note the `.then()` method is used to chain the steps, but the `.step()` method is used to add the steps to the workflow.

```ts showLineNumbers copy
myWorkflow
  .step(stepOne)
  .then(stepTwo) // chain one
  .step(stepThree)
  .then(stepFour) // chain two
  .commit();

const { start } = myWorkflow.createRun();

const result = await start({ triggerData: { inputValue: 3 } });
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/workflows-legacy/workflow-with-parallel-steps"
  }
/>

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Example: Sequential Steps | Workflows (Legacy) | Mastra Docs"
description: Example of using Mastra to chain legacy workflow steps in a specific sequence, passing data between them.
---

import { GithubLink } from "@/components/github-link";

# Workflow (Legacy) with Sequential Steps
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/sequential-steps

Workflow can be chained to run one after another in a specific sequence.

## Control Flow Diagram

This example shows how to chain workflow steps by using the `then` method demonstrating how to pass data between sequential steps and execute them in order.

Here's the control flow diagram:

<img
  src="/sequential-chains.png"
  alt="Diagram showing workflow with sequential steps"
  width={600}
/>

## Creating the Steps

Let's start by creating the steps and initializing the workflow.

```ts showLineNumbers copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const stepOne = new LegacyStep({
  id: "stepOne",
  execute: async ({ context }) => ({
    doubledValue: context.triggerData.inputValue * 2,
  }),
});

const stepTwo = new LegacyStep({
  id: "stepTwo",
  execute: async ({ context }) => {
    if (context.steps.stepOne.status !== "success") {
      return { incrementedValue: 0 };
    }

    return { incrementedValue: context.steps.stepOne.output.doubledValue + 1 };
  },
});

const stepThree = new LegacyStep({
  id: "stepThree",
  execute: async ({ context }) => {
    if (context.steps.stepTwo.status !== "success") {
      return { tripledValue: 0 };
    }

    return { tripledValue: context.steps.stepTwo.output.incrementedValue * 3 };
  },
});

// Build the workflow
const myWorkflow = new LegacyWorkflow({
  name: "my-workflow",
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});
```

## Chaining the Steps and Executing the Workflow

Now let's chain the steps together.

```ts showLineNumbers copy
// sequential steps
myWorkflow.step(stepOne).then(stepTwo).then(stepThree);

myWorkflow.commit();

const { start } = myWorkflow.createRun();

const res = await start({ triggerData: { inputValue: 90 } });
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/workflows-legacy/workflow-with-sequential-steps"
  }
/>

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Example: Suspend and Resume | Workflows (Legacy) | Mastra Docs"
description: Example of using Mastra to suspend and resume legacy workflow steps during execution.
---

import { GithubLink } from "@/components/github-link";

# Workflow (Legacy) with Suspend and Resume
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/suspend-and-resume

Workflow steps can be suspended and resumed at any point in the workflow execution. This example demonstrates how to suspend a workflow step and resume it later.

## Basic Example

```ts showLineNumbers copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const stepOne = new LegacyStep({
  id: "stepOne",
  outputSchema: z.object({
    doubledValue: z.number(),
  }),
  execute: async ({ context }) => {
    const doubledValue = context.triggerData.inputValue * 2;
    return { doubledValue };
  },
});
```

```ts showLineNumbers copy
const stepTwo = new LegacyStep({
  id: "stepTwo",
  outputSchema: z.object({
    incrementedValue: z.number(),
  }),
  execute: async ({ context, suspend }) => {
    const secondValue = context.inputData?.secondValue ?? 0;
    const doubledValue = context.getStepResult(stepOne)?.doubledValue ?? 0;

    const incrementedValue = doubledValue + secondValue;

    if (incrementedValue < 100) {
      await suspend();
      return { incrementedValue: 0 };
    }
    return { incrementedValue };
  },
});

// Build the workflow
const myWorkflow = new LegacyWorkflow({
  name: "my-workflow",
  triggerSchema: z.object({
    inputValue: z.number(),
  }),
});

// run workflows in parallel
myWorkflow.step(stepOne).then(stepTwo).commit();
```

```ts showLineNumbers copy
// Register the workflow
export const mastra = new Mastra({
  legacy_workflows: { registeredWorkflow: myWorkflow },
});

// Get registered workflow from Mastra
const registeredWorkflow = mastra.legacy_getWorkflow("registeredWorkflow");
const { runId, start } = registeredWorkflow.createRun();

// Start watching the workflow before executing it
myWorkflow.watch(async ({ context, activePaths }) => {
  for (const _path of activePaths) {
    const stepTwoStatus = context.steps?.stepTwo?.status;
    if (stepTwoStatus === "suspended") {
      console.log("Workflow suspended, resuming with new value");

      // Resume the workflow with new context
      await myWorkflow.resume({
        runId,
        stepId: "stepTwo",
        context: { secondValue: 100 },
      });
    }
  }
});

// Start the workflow execution
await start({ triggerData: { inputValue: 45 } });
```

## Advanced Example with Multiple Suspension Points Using async/await pattern and suspend payloads

This example demonstrates a more complex workflow with multiple suspension points using the async/await pattern. It simulates a content generation workflow that requires human intervention at different stages.

```ts showLineNumbers copy
import { Mastra } from "@mastra/core";
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Step 1: Get user input
const getUserInput = new LegacyStep({
  id: "getUserInput",
  execute: async ({ context }) => {
    // In a real application, this might come from a form or API
    return { userInput: context.triggerData.input };
  },
  outputSchema: z.object({ userInput: z.string() }),
});
```

```ts showLineNumbers copy
// Step 2: Generate content with AI (may suspend for human guidance)
const promptAgent = new LegacyStep({
  id: "promptAgent",
  inputSchema: z.object({
    guidance: z.string(),
  }),
  execute: async ({ context, suspend }) => {
    const userInput = context.getStepResult(getUserInput)?.userInput;
    console.log(`Generating content based on: ${userInput}`);

    const guidance = context.inputData?.guidance;

    // Simulate AI generating content
    const initialDraft = generateInitialDraft(userInput);

    // If confidence is high, return the generated content directly
    if (initialDraft.confidenceScore > 0.7) {
      return { modelOutput: initialDraft.content };
    }

    console.log(
      "Low confidence in generated content, suspending for human guidance",
      { guidance },
    );

    // If confidence is low, suspend for human guidance
    if (!guidance) {
      // only suspend if no guidance is provided
      await suspend();
      return undefined;
    }

    // This code runs after resume with human guidance
    console.log("Resumed with human guidance");

    // Use the human guidance to improve the output
    return {
      modelOutput: enhanceWithGuidance(initialDraft.content, guidance),
    };
  },
  outputSchema: z.object({ modelOutput: z.string() }).optional(),
});
```

```ts showLineNumbers copy
// Step 3: Evaluate the content quality
const evaluateTone = new LegacyStep({
  id: "evaluateToneConsistency",
  execute: async ({ context }) => {
    const content = context.getStepResult(promptAgent)?.modelOutput;

    // Simulate evaluation
    return {
      toneScore: { score: calculateToneScore(content) },
      completenessScore: { score: calculateCompletenessScore(content) },
    };
  },
  outputSchema: z.object({
    toneScore: z.any(),
    completenessScore: z.any(),
  }),
});
```

```ts showLineNumbers copy
// Step 4: Improve response if needed (may suspend)
const improveResponse = new LegacyStep({
  id: "improveResponse",
  inputSchema: z.object({
    improvedContent: z.string(),
    resumeAttempts: z.number(),
  }),
  execute: async ({ context, suspend }) => {
    const content = context.getStepResult(promptAgent)?.modelOutput;
    const toneScore = context.getStepResult(evaluateTone)?.toneScore.score ?? 0;
    const completenessScore =
      context.getStepResult(evaluateTone)?.completenessScore.score ?? 0;

    const improvedContent = context.inputData.improvedContent;
    const resumeAttempts = context.inputData.resumeAttempts ?? 0;

    // If scores are above threshold, make minor improvements
    if (toneScore > 0.8 && completenessScore > 0.8) {
      return { improvedOutput: makeMinorImprovements(content) };
    }

    console.log(
      "Content quality below threshold, suspending for human intervention",
      { improvedContent, resumeAttempts },
    );

    if (!improvedContent) {
      // Suspend with payload containing content and resume attempts
      await suspend({
        content,
        scores: { tone: toneScore, completeness: completenessScore },
        needsImprovement: toneScore < 0.8 ? "tone" : "completeness",
        resumeAttempts: resumeAttempts + 1,
      });
      return { improvedOutput: content ?? "" };
    }

    console.log("Resumed with human improvements", improvedContent);
    return { improvedOutput: improvedContent ?? content ?? "" };
  },
  outputSchema: z.object({ improvedOutput: z.string() }).optional(),
});
```

```ts showLineNumbers copy
// Step 5: Final evaluation
const evaluateImproved = new LegacyStep({
  id: "evaluateImprovedResponse",
  execute: async ({ context }) => {
    const improvedContent =
      context.getStepResult(improveResponse)?.improvedOutput;

    // Simulate final evaluation
    return {
      toneScore: { score: calculateToneScore(improvedContent) },
      completenessScore: { score: calculateCompletenessScore(improvedContent) },
    };
  },
  outputSchema: z.object({
    toneScore: z.any(),
    completenessScore: z.any(),
  }),
});

// Build the workflow
const contentWorkflow = new LegacyWorkflow({
  name: "content-generation-workflow",
  triggerSchema: z.object({ input: z.string() }),
});

contentWorkflow
  .step(getUserInput)
  .then(promptAgent)
  .then(evaluateTone)
  .then(improveResponse)
  .then(evaluateImproved)
  .commit();
```

```ts showLineNumbers copy
// Register the workflow
const mastra = new Mastra({
  legacy_workflows: { contentWorkflow },
});

// Helper functions (simulated)
function generateInitialDraft(input: string = "") {
  // Simulate AI generating content
  return {
    content: `Generated content based on: ${input}`,
    confidenceScore: 0.6, // Simulate low confidence to trigger suspension
  };
}

function enhanceWithGuidance(content: string = "", guidance: string = "") {
  return `${content} (Enhanced with guidance: ${guidance})`;
}

function makeMinorImprovements(content: string = "") {
  return `${content} (with minor improvements)`;
}

function calculateToneScore(_: string = "") {
  return 0.7; // Simulate a score that will trigger suspension
}

function calculateCompletenessScore(_: string = "") {
  return 0.9;
}

// Usage example
async function runWorkflow() {
  const workflow = mastra.legacy_getWorkflow("contentWorkflow");
  const { runId, start } = workflow.createRun();

  let finalResult: any;

  // Start the workflow
  const initialResult = await start({
    triggerData: { input: "Create content about sustainable energy" },
  });

  console.log("Initial workflow state:", initialResult.results);

  const promptAgentStepResult = initialResult.activePaths.get("promptAgent");

  // Check if promptAgent step is suspended
  if (promptAgentStepResult?.status === "suspended") {
    console.log("Workflow suspended at promptAgent step");
    console.log("Suspension payload:", promptAgentStepResult?.suspendPayload);

    // Resume with human guidance
    const resumeResult1 = await workflow.resume({
      runId,
      stepId: "promptAgent",
      context: {
        guidance: "Focus more on solar and wind energy technologies",
      },
    });

    console.log("Workflow resumed and continued to next steps");

    let improveResponseResumeAttempts = 0;
    let improveResponseStatus =
      resumeResult1?.activePaths.get("improveResponse")?.status;

    // Check if improveResponse step is suspended
    while (improveResponseStatus === "suspended") {
      console.log("Workflow suspended at improveResponse step");
      console.log(
        "Suspension payload:",
        resumeResult1?.activePaths.get("improveResponse")?.suspendPayload,
      );

      const improvedContent =
        improveResponseResumeAttempts < 3
          ? undefined
          : "Completely revised content about sustainable energy focusing on solar and wind technologies";

      // Resume with human improvements
      finalResult = await workflow.resume({
        runId,
        stepId: "improveResponse",
        context: {
          improvedContent,
          resumeAttempts: improveResponseResumeAttempts,
        },
      });

      improveResponseResumeAttempts =
        finalResult?.activePaths.get("improveResponse")?.suspendPayload
          ?.resumeAttempts ?? 0;
      improveResponseStatus =
        finalResult?.activePaths.get("improveResponse")?.status;

      console.log("Improved response result:", finalResult?.results);
    }
  }
  return finalResult;
}

// Run the workflow
const result = await runWorkflow();
console.log("Workflow completed");
console.log("Final workflow result:", result);
```

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)


---
title: "Example: Using a Tool as a Step | Workflows (Legacy) | Mastra Docs"
description: Example of using Mastra to integrate a custom tool as a step in a legacy workflow.
---

import { GithubLink } from "@/components/github-link";

# Tool as a Workflow step (Legacy)
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/using-a-tool-as-a-step

This example demonstrates how to create and integrate a custom tool as a workflow step, showing how to define input/output schemas and implement the tool's execution logic.

```ts showLineNumbers copy
import { createTool } from "@mastra/core/tools";
import { LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

const crawlWebpage = createTool({
  id: "Crawl Webpage",
  description: "Crawls a webpage and extracts the text content",
  inputSchema: z.object({
    url: z.string().url(),
  }),
  outputSchema: z.object({
    rawText: z.string(),
  }),
  execute: async ({ context }) => {
    const response = await fetch(context.triggerData.url);
    const text = await response.text();
    return { rawText: "This is the text content of the webpage: " + text };
  },
});

const contentWorkflow = new LegacyWorkflow({ name: "content-review" });

contentWorkflow.step(crawlWebpage).commit();

const { start } = contentWorkflow.createRun();

const res = await start({ triggerData: { url: "https://example.com" } });

console.log(res.results);
```

<br />
<br />
<hr className="dark:border-[#404040] border-gray-300" />
<br />
<br />
<GithubLink
  link={
    "https://github.com/mastra-ai/mastra/blob/main/examples/basics/workflows-legacy/tool-as-workflow-step"
  }
/>

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Data Mapping with Workflow Variables (Legacy)](/examples/workflows_legacy/workflow-variables)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Data Mapping with Workflow Variables (Legacy) | Mastra Examples"
description: "Learn how to use workflow variables to map data between steps in Mastra workflows."
---

# Data Mapping with Workflow Variables (Legacy)
[EN] Source: https://mastra.ai/en/examples/workflows_legacy/workflow-variables

This example demonstrates how to use workflow variables to map data between steps in a Mastra workflow.

## Use Case: User Registration Process

In this example, we'll build a simple user registration workflow that:

1. Validates user input
1. Formats the user data
1. Creates a user profile

## Implementation

```typescript showLineNumbers filename="src/mastra/workflows/user-registration.ts" copy
import { LegacyStep, LegacyWorkflow } from "@mastra/core/workflows/legacy";
import { z } from "zod";

// Define our schemas for better type safety
const userInputSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  age: z.number().min(18),
});

const validatedDataSchema = z.object({
  isValid: z.boolean(),
  validatedData: z.object({
    email: z.string(),
    name: z.string(),
    age: z.number(),
  }),
});

const formattedDataSchema = z.object({
  userId: z.string(),
  formattedData: z.object({
    email: z.string(),
    displayName: z.string(),
    ageGroup: z.string(),
  }),
});

const profileSchema = z.object({
  profile: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string(),
    ageGroup: z.string(),
    createdAt: z.string(),
  }),
});

// Define the workflow
const registrationWorkflow = new LegacyWorkflow({
  name: "user-registration",
  triggerSchema: userInputSchema,
});

// Step 1: Validate user input
const validateInput = new LegacyStep({
  id: "validateInput",
  inputSchema: userInputSchema,
  outputSchema: validatedDataSchema,
  execute: async ({ context }) => {
    const { email, name, age } = context;

    // Simple validation logic
    const isValid = email.includes("@") && name.length > 0 && age >= 18;

    return {
      isValid,
      validatedData: {
        email: email.toLowerCase().trim(),
        name,
        age,
      },
    };
  },
});

// Step 2: Format user data
const formatUserData = new LegacyStep({
  id: "formatUserData",
  inputSchema: z.object({
    validatedData: z.object({
      email: z.string(),
      name: z.string(),
      age: z.number(),
    }),
  }),
  outputSchema: formattedDataSchema,
  execute: async ({ context }) => {
    const { validatedData } = context;

    // Generate a simple user ID
    const userId = `user_${Math.floor(Math.random() * 10000)}`;

    // Format the data
    const ageGroup = validatedData.age < 30 ? "young-adult" : "adult";

    return {
      userId,
      formattedData: {
        email: validatedData.email,
        displayName: validatedData.name,
        ageGroup,
      },
    };
  },
});

// Step 3: Create user profile
const createUserProfile = new LegacyStep({
  id: "createUserProfile",
  inputSchema: z.object({
    userId: z.string(),
    formattedData: z.object({
      email: z.string(),
      displayName: z.string(),
      ageGroup: z.string(),
    }),
  }),
  outputSchema: profileSchema,
  execute: async ({ context }) => {
    const { userId, formattedData } = context;

    // In a real app, you would save to a database here

    return {
      profile: {
        id: userId,
        ...formattedData,
        createdAt: new Date().toISOString(),
      },
    };
  },
});

// Build the workflow with variable mappings
registrationWorkflow
  // First step gets data from the trigger
  .step(validateInput, {
    variables: {
      email: { step: "trigger", path: "email" },
      name: { step: "trigger", path: "name" },
      age: { step: "trigger", path: "age" },
    },
  })
  // Format user data with validated data from previous step
  .then(formatUserData, {
    variables: {
      validatedData: { step: validateInput, path: "validatedData" },
    },
    when: {
      ref: { step: validateInput, path: "isValid" },
      query: { $eq: true },
    },
  })
  // Create profile with data from the format step
  .then(createUserProfile, {
    variables: {
      userId: { step: formatUserData, path: "userId" },
      formattedData: { step: formatUserData, path: "formattedData" },
    },
  })
  .commit();

export default registrationWorkflow;
```

## How to Use This Example

1. Create the file as shown above
2. Register the workflow in your Mastra instance
3. Execute the workflow:

```bash
curl --location 'http://localhost:5000/api/workflows/user-registration/start-async' \
     --header 'Content-Type: application/json' \
     --data '{
       "email": "user@example.com",
       "name": "John Doe",
       "age": 25
     }'
```

## Key Takeaways

This example demonstrates several important concepts about workflow variables:

1. **Data Mapping**: Variables map data from one step to another, creating a clear data flow.

2. **Path Access**: The `path` property specifies which part of a step's output to use.

3. **Conditional Execution**: The `when` property allows steps to execute conditionally based on previous step outputs.

4. **Type Safety**: Each step defines input and output schemas for type safety, ensuring that the data passed between steps is properly typed.

5. **Explicit Data Dependencies**: By defining input schemas and using variable mappings, the data dependencies between steps are made explicit and clear.

For more information on workflow variables, see the [Workflow Variables documentation](../../docs/workflows-legacy/variables.mdx).

## Workflows (Legacy)

The following links provide example documentation for legacy workflows:

- [Creating a Simple Workflow (Legacy)](/examples/workflows_legacy/creating-a-workflow)
- [Workflow (Legacy) with Sequential Steps](/examples/workflows_legacy/sequential-steps)
- [Parallel Execution with Steps](/examples/workflows_legacy/parallel-steps)
- [Branching Paths](/examples/workflows_legacy/branching-paths)
- [Workflow (Legacy) with Conditional Branching (experimental)](/examples/workflows_legacy/conditional-branching)
- [Calling an Agent From a Workflow (Legacy)](/examples/workflows_legacy/calling-agent)
- [Tool as a Workflow step (Legacy)](/examples/workflows_legacy/using-a-tool-as-a-step)
- [Workflow (Legacy) with Cyclical dependencies](/examples/workflows_legacy/cyclical-dependencies)
- [Human in the Loop Workflow (Legacy)](/examples/workflows_legacy/human-in-the-loop)
- [Workflow (Legacy) with Suspend and Resume](/examples/workflows_legacy/suspend-and-resume)


---
title: "Building an AI Recruiter | Mastra Workflows | Guides"
description: Guide on building a recruiter workflow in Mastra to gather and process candidate information using LLMs.
---

# Introduction
[EN] Source: https://mastra.ai/en/guides/guide/ai-recruiter

In this guide, you'll learn how Mastra helps you build workflows with LLMs.

We'll walk through creating a workflow that gathers information from a candidate's resume, then branches to either a technical or behavioral question based on the candidate's profile. Along the way, you'll see how to structure workflow steps, handle branching, and integrate LLM calls.

Below is a concise version of the workflow. It starts by importing the necessary modules, sets up Mastra, defines steps to extract and classify candidate data, and then asks suitable follow-up questions. Each code block is followed by a short explanation of what it does and why it's useful.

## 1. Imports and Setup

You need to import Mastra tools and Zod to handle workflow definitions and data validation.

```ts filename="src/mastra/index.ts" copy
import { Mastra } from "@mastra/core";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
```

Add your `OPENAI_API_KEY` to the `.env` file.

```bash filename=".env" copy
OPENAI_API_KEY=<your-openai-key>
```

## 2. Step One: Gather Candidate Info

You want to extract candidate details from the resume text and classify them as technical or non-technical. This step calls an LLM to parse the resume and return structured JSON, including the name, technical status, specialty, and the original resume text. The code reads resumeText from trigger data, prompts the LLM, and returns organized fields for use in subsequent steps.

```ts filename="src/mastra/index.ts" copy
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const recruiter = new Agent({
  name: "Recruiter Agent",
  instructions: `You are a recruiter.`,
  model: openai("gpt-4o-mini"),
});

const gatherCandidateInfo = createStep({
  id: "gatherCandidateInfo",
  inputSchema: z.object({
    resumeText: z.string(),
  }),
  outputSchema: z.object({
    candidateName: z.string(),
    isTechnical: z.boolean(),
    specialty: z.string(),
    resumeText: z.string(),
  }),
  execute: async ({ inputData }) => {
    const resumeText = inputData?.resumeText;

    const prompt = `
          Extract details from the resume text:
          "${resumeText}"
        `;

    const res = await recruiter.generate(prompt, {
      output: z.object({
        candidateName: z.string(),
        isTechnical: z.boolean(),
        specialty: z.string(),
        resumeText: z.string(),
      }),
    });

    return res.object;
  },
});
```

## 3. Technical Question Step

This step prompts a candidate who is identified as technical for more information about how they got into their specialty. It uses the entire resume text so the LLM can craft a relevant follow-up question. The code generates a question about the candidate's specialty.

```ts filename="src/mastra/index.ts" copy
interface CandidateInfo {
  candidateName: string;
  isTechnical: boolean;
  specialty: string;
  resumeText: string;
}

const askAboutSpecialty = createStep({
  id: "askAboutSpecialty",
  inputSchema: z.object({
    candidateName: z.string(),
    isTechnical: z.boolean(),
    specialty: z.string(),
    resumeText: z.string(),
  }),
  outputSchema: z.object({
    question: z.string(),
  }),
  execute: async ({ inputData }) => {
    const candidateInfo = inputData;

    const prompt = `
          You are a recruiter. Given the resume below, craft a short question
          for ${candidateInfo?.candidateName} about how they got into "${candidateInfo?.specialty}".
          Resume: ${candidateInfo?.resumeText}
        `;
    const res = await recruiter.generate(prompt);

    return { question: res?.text?.trim() || "" };
  },
});
```

## 4. Behavioral Question Step

If the candidate is non-technical, you want a different follow-up question. This step asks what interests them most about the role, again referencing their complete resume text. The code solicits a role-focused query from the LLM.

```ts filename="src/mastra/index.ts" copy
const askAboutRole = createStep({
  id: "askAboutRole",
  inputSchema: z.object({
    candidateName: z.string(),
    isTechnical: z.boolean(),
    specialty: z.string(),
    resumeText: z.string(),
  }),
  outputSchema: z.object({
    question: z.string(),
  }),
  execute: async ({ inputData }) => {
    const candidateInfo = inputData;

    const prompt = `
          You are a recruiter. Given the resume below, craft a short question
          for ${candidateInfo?.candidateName} asking what interests them most about this role.
          Resume: ${candidateInfo?.resumeText}
        `;
    const res = await recruiter.generate(prompt);
    return { question: res?.text?.trim() || "" };
  },
});
```

## 5. Define the Workflow

You now combine the steps to implement branching logic based on the candidate's technical status. The workflow first gathers candidate data, then either asks about their specialty or about their role, depending on isTechnical. The code chains gatherCandidateInfo with askAboutSpecialty and askAboutRole, and commits the workflow.

```ts filename="src/mastra/index.ts" copy
const candidateWorkflow = createWorkflow({
  id: "candidate-workflow",
  inputSchema: z.object({
    resumeText: z.string(),
  }),
  outputSchema: z.object({
    question: z.string(),
  }),
});

candidateWorkflow.then(gatherCandidateInfo).branch([
  // Branch for technical candidates
  [
    async ({ inputData }) => {
      return inputData?.isTechnical;
    },
    askAboutSpecialty,
  ],
  // Branch for non-technical candidates
  [
    async ({ inputData }) => {
      return !inputData?.isTechnical;
    },
    askAboutRole,
  ],
]);

candidateWorkflow.commit();
```

## 6. Execute the Workflow

```ts filename="src/mastra/index.ts" copy
const mastra = new Mastra({
  workflows: {
    candidateWorkflow,
  },
});

(async () => {
  const run = await mastra.getWorkflow("candidateWorkflow").createRunAsync();

  console.log("Run", run.runId);

  const runResult = await run.start({
    inputData: { resumeText: "Simulated resume content..." },
  });

  console.log("Final output:", runResult);
})();
```

You've just built a workflow to parse a resume and decide which question to ask based on the candidate's technical abilities. Congrats and happy hacking!


---
title: "Building an AI Chef Assistant | Mastra Agent Guides"
description: Guide on creating a Chef Assistant agent in Mastra to help users cook meals with available ingredients.
---

import { Steps } from "nextra/components";
import YouTube from "@/components/youtube";

# Agents Guide: Building a Chef Assistant
[EN] Source: https://mastra.ai/en/guides/guide/chef-michel

In this guide, we'll walk through creating a "Chef Assistant" agent that helps users cook meals with available ingredients.

<YouTube id="_tZhOqHCrF0" />

## Prerequisites

- Node.js installed
- Mastra installed: `npm install @mastra/core@latest`

---

## Create the Agent

<Steps>
### Define the Agent

Create a new file `src/mastra/agents/chefAgent.ts` and define your agent:

```ts copy filename="src/mastra/agents/chefAgent.ts"
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

export const chefAgent = new Agent({
  name: "chef-agent",
  instructions:
    "You are Michel, a practical and experienced home chef" +
    "You help people cook with whatever ingredients they have available.",
  model: openai("gpt-4o-mini"),
});
```

---

## Set Up Environment Variables

Create a `.env` file in your project root and add your OpenAI API key:

```bash filename=".env" copy
OPENAI_API_KEY=your_openai_api_key
```

---

## Register the Agent with Mastra

In your main file, register the agent:

```ts copy filename="src/mastra/index.ts"
import { Mastra } from "@mastra/core";

import { chefAgent } from "./agents/chefAgent";

export const mastra = new Mastra({
  agents: { chefAgent },
});
```

---

</Steps >

## Interacting with the Agent

<Steps>
### Generating Text Responses

```ts copy filename="src/index.ts"
async function main() {
  const query =
    "In my kitchen I have: pasta, canned tomatoes, garlic, olive oil, and some dried herbs (basil and oregano). What can I make?";
  console.log(`Query: ${query}`);

  const response = await chefAgent.generate([{ role: "user", content: query }]);
  console.log("\n👨‍🍳 Chef Michel:", response.text);
}

main();
```

Run the script:

```bash copy
npx bun src/index.ts
```

Output:

```
Query: In my kitchen I have: pasta, canned tomatoes, garlic, olive oil, and some dried herbs (basil and oregano). What can I make?

👨‍🍳 Chef Michel: You can make a delicious pasta al pomodoro! Here's how...
```

---

### Streaming Responses

```ts copy filename="src/index.ts"
async function main() {
  const query =
    "Now I'm over at my friend's house, and they have: chicken thighs, coconut milk, sweet potatoes, and some curry powder.";
  console.log(`Query: ${query}`);

  const stream = await chefAgent.stream([{ role: "user", content: query }]);

  console.log("\n Chef Michel: ");

  for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
  }

  console.log("\n\n✅ Recipe complete!");
}

main();
```

Output:

```
Query: Now I'm over at my friend's house, and they have: chicken thighs, coconut milk, sweet potatoes, and some curry powder.

👨‍🍳 Chef Michel:
Great! You can make a comforting chicken curry...

✅ Recipe complete!
```

---

### Generating a Recipe with Structured Data

```ts copy filename="src/index.ts"
import { z } from "zod";

async function main() {
  const query =
    "I want to make lasagna, can you generate a lasagna recipe for me?";
  console.log(`Query: ${query}`);

  // Define the Zod schema
  const schema = z.object({
    ingredients: z.array(
      z.object({
        name: z.string(),
        amount: z.string(),
      }),
    ),
    steps: z.array(z.string()),
  });

  const response = await chefAgent.generate(
    [{ role: "user", content: query }],
    { output: schema },
  );
  console.log("\n👨‍🍳 Chef Michel:", response.object);
}

main();
```

Output:

```
Query: I want to make lasagna, can you generate a lasagna recipe for me?

👨‍🍳 Chef Michel: {
  ingredients: [
    { name: "Lasagna noodles", amount: "12 sheets" },
    { name: "Ground beef", amount: "1 pound" },
    // ...
  ],
  steps: [
    "Preheat oven to 375°F (190°C).",
    "Cook the lasagna noodles according to package instructions.",
    // ...
  ]
}
```

---

</Steps >

## Running the Agent Server

<Steps>

### Using `mastra dev`

You can run your agent as a service using the `mastra dev` command:

```bash copy
mastra dev
```

This will start a server exposing endpoints to interact with your registered agents.

### Accessing the Chef Assistant API

By default, `mastra dev` runs on `http://localhost:5000`. Your Chef Assistant agent will be available at:

```
POST http://localhost:5000/api/agents/chefAgent/generate
```

### Interacting with the Agent via `curl`

You can interact with the agent using `curl` from the command line:

```bash copy
curl -X POST http://localhost:5000/api/agents/chefAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "I have eggs, flour, and milk. What can I make?"
      }
    ]
  }'
```

**Sample Response:**

```json
{
  "text": "You can make delicious pancakes! Here's a simple recipe..."
}
```

</Steps>


---
title: "MCP Server: Building a Notes MCP Server | Mastra Guide"
description: "A step-by-step guide to creating a fully-featured MCP (Model Context Protocol) server for managing notes using the Mastra framework."
---

import { FileTree, Steps } from "nextra/components";

# Building a Research Paper Assistant with RAG
[EN] Source: https://mastra.ai/en/guides/guide/research-assistant

In this guide, we'll create an AI research assistant that can analyze academic papers and answer specific questions about their content using Retrieval Augmented Generation (RAG).

We'll use the foundational Transformer paper [Attention Is All You Need](https://arxiv.org/html/1706.03762) as our example.

## Understanding RAG Components

Let's understand how RAG works and how we'll implement each component:

1. Knowledge Store/Index

   - Converting text into vector representations
   - Creating numerical representations of content
   - Implementation: We'll use OpenAI's text-embedding-3-small to create embeddings and store them in PgVector

2. Retriever

   - Finding relevant content via similarity search
   - Matching query embeddings with stored vectors
   - Implementation: We'll use PgVector to perform similarity searches on our stored embeddings

3. Generator
   - Processing retrieved content with an LLM
   - Creating contextually informed responses
   - Implementation: We'll use GPT-4o-mini to generate answers based on retrieved content

Our implementation will:

1. Process the Transformer paper into embeddings
2. Store them in PgVector for quick retrieval
3. Use similarity search to find relevant sections
4. Generate accurate responses using retrieved context

## Project Structure

```
research-assistant/
├── src/
│   ├── mastra/
│   │   ├── agents/
│   │   │   └── researchAgent.ts
│   │   └── index.ts
│   ├── index.ts
│   └── store.ts
├── package.json
└── .env
```

<Steps>
### Initialize Project and Install Dependencies

First, create a new directory for your project and navigate into it:

```bash
mkdir research-assistant
cd research-assistant
```

Initialize a new Node.js project and install the required dependencies:

```bash copy
npm init -y
npm install @mastra/core@latest @mastra/rag@latest @mastra/pg@latest @ai-sdk/openai@latest ai@latest zod@latest
```

Set up environment variables for API access and database connection:

```bash filename=".env" copy
OPENAI_API_KEY=your_openai_api_key
POSTGRES_CONNECTION_STRING=your_connection_string
```

Create the necessary files for our project:

```bash copy
mkdir -p src/mastra/agents
touch src/mastra/agents/researchAgent.ts
touch src/mastra/index.ts src/store.ts src/index.ts
```

### Create the Research Assistant Agent

Now we'll create our RAG-enabled research assistant. The agent uses:

- A [Vector Query Tool](/reference/tools/vector-query-tool) for performing semantic search over our vector store to find relevant content in our papers.
- GPT-4o-mini for understanding queries and generating responses
- Custom instructions that guide the agent on how to analyze papers, use retrieved content effectively, and acknowledge limitations

```ts copy showLineNumbers filename="src/mastra/agents/researchAgent.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { createVectorQueryTool } from "@mastra/rag";

// Create a tool for semantic search over our paper embeddings
const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "pgVector",
  indexName: "papers",
  model: openai.embedding("text-embedding-3-small"),
});

export const researchAgent = new Agent({
  name: "Research Assistant",
  instructions: `You are a helpful research assistant that analyzes academic papers and technical documents.
    Use the provided vector query tool to find relevant information from your knowledge base, 
    and provide accurate, well-supported answers based on the retrieved content.
    Focus on the specific content available in the tool and acknowledge if you cannot find sufficient information to answer a question.
    Base your responses only on the content provided, not on general knowledge.`,
  model: openai("gpt-4o-mini"),
  tools: {
    vectorQueryTool,
  },
});
```

### Set Up the Mastra Instance and Vector Store

```ts copy showLineNumbers filename="src/mastra/index.ts"
import { Mastra } from "@mastra/core";
import { PgVector } from "@mastra/pg";

import { researchAgent } from "./agents/researchAgent";

// Initialize Mastra instance
const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});
export const mastra = new Mastra({
  agents: { researchAgent },
  vectors: { pgVector },
});
```

### Load and Process the Paper

This step handles the initial document processing. We:

1. Fetch the research paper from its URL
2. Convert it into a document object
3. Split it into smaller, manageable chunks for better processing

```ts copy showLineNumbers filename="src/store.ts"
import { openai } from "@ai-sdk/openai";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { mastra } from "./mastra";

// Load the paper
const paperUrl = "https://arxiv.org/html/1706.03762";
const response = await fetch(paperUrl);
const paperText = await response.text();

// Create document and chunk it
const doc = MDocument.fromText(paperText);
const chunks = await doc.chunk({
  strategy: "recursive",
  size: 512,
  overlap: 50,
  separator: "\n",
});

console.log("Number of chunks:", chunks.length);
// Number of chunks: 893
```

### Create and Store Embeddings

Finally, we'll prepare our content for RAG by:

1. Generating embeddings for each chunk of text
2. Creating a vector store index to hold our embeddings
3. Storing both the embeddings and metadata (original text and source information) in our vector database

> **Note**: This metadata is crucial as it allows us to return the actual content when the vector store finds relevant matches.

This allows our agent to efficiently search and retrieve relevant information.

```ts copy showLineNumbers{23} filename="src/store.ts"
// Generate embeddings
const { embeddings } = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: chunks.map((chunk) => chunk.text),
});

// Get the vector store instance from Mastra
const vectorStore = mastra.getVector("pgVector");

// Create an index for our paper chunks
await vectorStore.createIndex({
  indexName: "papers",
  dimension: 1536,
});

// Store embeddings
await vectorStore.upsert({
  indexName: "papers",
  vectors: embeddings,
  metadata: chunks.map((chunk) => ({
    text: chunk.text,
    source: "transformer-paper",
  })),
});
```

This will:

1. Load the paper from the URL
2. Split it into manageable chunks
3. Generate embeddings for each chunk
4. Store both the embeddings and text in our vector database

To run the script and store the embeddings:

```bash
npx bun src/store.ts
```

### Test the Assistant

Let's test our research assistant with different types of queries:

```ts filename="src/index.ts" showLineNumbers copy
import { mastra } from "./mastra";
const agent = mastra.getAgent("researchAgent");

// Basic query about concepts
const query1 =
  "What problems does sequence modeling face with neural networks?";
const response1 = await agent.generate(query1);
console.log("\nQuery:", query1);
console.log("Response:", response1.text);
```

Run the script:

```bash copy
npx bun src/index.ts
```

You should see output like:

```
Query: What problems does sequence modeling face with neural networks?
Response: Sequence modeling with neural networks faces several key challenges:
1. Vanishing and exploding gradients during training, especially with long sequences
2. Difficulty handling long-term dependencies in the input
3. Limited computational efficiency due to sequential processing
4. Challenges in parallelizing computations, resulting in longer training times
```

Let's try another question:

```ts filename="src/index.ts" showLineNumbers{10} copy
// Query about specific findings
const query2 = "What improvements were achieved in translation quality?";
const response2 = await agent.generate(query2);
console.log("\nQuery:", query2);
console.log("Response:", response2.text);
```

Output:

```
Query: What improvements were achieved in translation quality?
Response: The model showed significant improvements in translation quality, achieving more than 2.0
BLEU points improvement over previously reported models on the WMT 2014 English-to-German translation
task, while also reducing training costs.
```

### Serve the Application

Start the Mastra server to expose your research assistant via API:

```bash
mastra dev
```

Your research assistant will be available at:

```
http://localhost:5000/api/agents/researchAgent/generate
```

Test with curl:

```bash
curl -X POST http://localhost:5000/api/agents/researchAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "What were the main findings about model parallelization?" }
    ]
  }'
```

</Steps>

## Advanced RAG Examples

Explore these examples for more advanced RAG techniques:

- [Filter RAG](/examples/rag/usage/filter-rag) for filtering results using metadata
- [Cleanup RAG](/examples/rag/usage/cleanup-rag) for optimizing information density
- [Chain of Thought RAG](/examples/rag/usage/cot-rag) for complex reasoning queries using workflows
- [Rerank RAG](/examples/rag/usage/rerank-rag) for improved result relevance


---
title: "Building an AI Stock Agent | Mastra Agents | Guides"
description: Guide on creating a simple stock agent in Mastra to fetch the last day's closing stock price for a given symbol.
---

import { Steps } from "nextra/components";
import YouTube from "@/components/youtube";

# Stock Agent
[EN] Source: https://mastra.ai/en/guides/guide/stock-agent

We're going to create a simple agent that fetches the last day's closing stock price for a given symbol. This example will show you how to create a tool, add it to an agent, and use the agent to fetch stock prices.

<YouTube id="rIaZ4l7y9wo" />

## Project Structure

```
stock-price-agent/
├── src/
│   ├── agents/
│   │   └── stockAgent.ts
│   ├── tools/
│   │   └── stockPrices.ts
│   └── index.ts
├── package.json
└── .env
```

---

<Steps>
## Initialize the Project and Install Dependencies

First, create a new directory for your project and navigate into it:

```bash
mkdir stock-price-agent
cd stock-price-agent
```

Initialize a new Node.js project and install the required dependencies:

```bash copy
npm init -y
npm install @mastra/core@latest zod @ai-sdk/openai
```

Set Up Environment Variables

Create a `.env` file at the root of your project to store your OpenAI API key.

```bash filename=".env" copy
OPENAI_API_KEY=your_openai_api_key
```

Create the necessary directories and files:

```bash
mkdir -p src/agents src/tools
touch src/agents/stockAgent.ts src/tools/stockPrices.ts src/index.ts
```

---

## Create the Stock Price Tool

Next, we'll create a tool that fetches the last day's closing stock price for a given symbol.

```ts filename="src/tools/stockPrices.ts"
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const getStockPrice = async (symbol: string) => {
  const data = await fetch(
    `https://mastra-stock-data.vercel.app/api/stock-data?symbol=${symbol}`,
  ).then((r) => r.json());
  return data.prices["4. close"];
};

export const stockPrices = createTool({
  id: "Get Stock Price",
  inputSchema: z.object({
    symbol: z.string(),
  }),
  description: `Fetches the last day's closing stock price for a given symbol`,
  execute: async ({ context: { symbol } }) => {
    console.log("Using tool to fetch stock price for", symbol);
    return {
      symbol,
      currentPrice: await getStockPrice(symbol),
    };
  },
});
```

---

## Add the Tool to an Agent

We'll create an agent and add the `stockPrices` tool to it.

```ts filename="src/agents/stockAgent.ts"
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

import * as tools from "../tools/stockPrices";

export const stockAgent = new Agent<typeof tools>({
  name: "Stock Agent",
  instructions:
    "You are a helpful assistant that provides current stock prices. When asked about a stock, use the stock price tool to fetch the stock price.",
  model: openai("gpt-4o-mini"),
  tools: {
    stockPrices: tools.stockPrices,
  },
});
```

---

## Set Up the Mastra Instance

We need to initialize the Mastra instance with our agent and tool.

```ts filename="src/index.ts"
import { Mastra } from "@mastra/core";

import { stockAgent } from "./agents/stockAgent";

export const mastra = new Mastra({
  agents: { stockAgent },
});
```

## Serve the Application

Instead of running the application directly, we'll use the `mastra dev` command to start the server. This will expose your agent via REST API endpoints, allowing you to interact with it over HTTP.

In your terminal, start the Mastra server by running:

```bash
mastra dev --dir src
```

This command will allow you to test your stockPrices tool and your stockAgent within the playground.

This will also start the server and make your agent available at:

```
http://localhost:5000/api/agents/stockAgent/generate
```

---

## Test the Agent with cURL

Now that your server is running, you can test your agent's endpoint using `curl`:

```bash
curl -X POST http://localhost:5000/api/agents/stockAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "What is the current stock price of Apple (AAPL)?" }
    ]
  }'
```

**Expected Response:**

You should receive a JSON response similar to:

```json
{
  "text": "The current price of Apple (AAPL) is $174.55.",
  "agent": "Stock Agent"
}
```

This indicates that your agent successfully processed the request, used the `stockPrices` tool to fetch the stock price, and returned the result.

</Steps>


---
title: "Overview"
description: "Guides on building with Mastra"
---

import { CardGrid, CardGridItem } from "@/components/cards/card-grid";

# Guides
[EN] Source: https://mastra.ai/en/guides

While examples show quick implementations and docs explain specific features, these guides are a bit longer and designed to demonstrate core Mastra concepts:

<CardGrid>
    <CardGridItem
      title="AI Recruiter"
      description="Create a workflow that processes candidate resumes and conducts interviews, demonstrating branching logic and LLM integration in Mastra workflows."
      href="./guides/guide/ai-recruiter"
    />
    <CardGridItem
      title="Chef Assistant"
      description="Build an AI chef agent that helps users cook meals with available ingredients, showing how to create interactive agents with custom tools."
      href="./guides/guide/chef-michel"
    />
    <CardGridItem
      title="Research Assistant"
      description="Develop an AI research assistant that analyzes academic papers using Retrieval Augmented Generation (RAG), demonstrating document processing and question answering."
      href="./guides/guide/research-assistant"
    />
    <CardGridItem
      title="Stock Agent"
      description="Implement a simple agent that fetches stock prices, illustrating the basics of creating tools and integrating them with Mastra agents."
      href="./guides/guide/stock-agent"
    />
    <CardGridItem
      title="Notes MCP Server"
      description="Build an AI notes assistant that helps users manage their notes, showing how to create interactive agents with custom tools."
      href="./guides/guide/notes-mcp-server"
    />
</CardGrid>

---
title: "Reference: Agent | Agents | Mastra Docs"
description: "Documentation for the Agent class in Mastra, which provides the foundation for creating AI agents with various capabilities."
---

# Agent
[EN] Source: https://mastra.ai/en/reference/agents/agent

The `Agent` class is the foundation for creating AI agents in Mastra. It provides methods for generating responses, streaming interactions, and handling voice capabilities.

## Importing

```typescript
import { Agent } from "@mastra/core/agent";
```

## Constructor

Creates a new Agent instance with the specified configuration.

```typescript
constructor(config: AgentConfig<TAgentId, TTools, TMetrics>)
```

### Parameters

<br />

<PropertiesTable
  content={[
    {
      name: "name",
      type: "string",
      isOptional: false,
      description: "Unique identifier for the agent.",
    },
    {
      name: "description",
      type: "string",
      isOptional: true,
      description:
        "An optional description of the agent\'s purpose and capabilities.",
    },
    {
      name: "instructions",
      type: "string | ({ runtimeContext: RuntimeContext }) => string | Promise<string>",
      isOptional: false,
      description:
        "Instructions that guide the agent's behavior. Can be a static string or a function that returns a string.",
    },
    {
      name: "model",
      type: "MastraLanguageModel | ({ runtimeContext: RuntimeContext }) => MastraLanguageModel | Promise<MastraLanguageModel>",
      isOptional: false,
      description:
        "The language model to use for generating responses. Can be a model instance or a function that returns a model.",
    },
    {
      name: "tools",
      type: "ToolsInput | ({ runtimeContext: RuntimeContext }) => ToolsInput | Promise<ToolsInput>",
      isOptional: true,
      description:
        "Tools that the agent can use. Can be a static object or a function that returns tools.",
    },
    {
      name: "defaultGenerateOptions",
      type: "AgentGenerateOptions",
      isOptional: true,
      description: "Default options to use when calling generate().",
    },
    {
      name: "defaultStreamOptions",
      type: "AgentStreamOptions",
      isOptional: true,
      description: "Default options to use when calling stream().",
    },
    {
      name: "workflows",
      type: "Record<string, NewWorkflow> | ({ runtimeContext: RuntimeContext }) => Record<string, NewWorkflow> | Promise<Record<string, NewWorkflow>>",
      isOptional: true,
      description:
        "Workflows that the agent can execute. Can be a static object or a function that returns workflows.",
    },
    {
      name: "evals",
      type: "Record<string, Metric>",
      isOptional: true,
      description: "Evaluation metrics for assessing agent performance.",
    },
    {
      name: "memory",
      type: "MastraMemory",
      isOptional: true,
      description:
        "Memory system for the agent to store and retrieve information.",
    },
    {
      name: "voice",
      type: "CompositeVoice",
      isOptional: true,
      description:
        "Voice capabilities for speech-to-text and text-to-speech functionality.",
    },
  ]}
/>


---
title: "Reference: createTool() | Tools | Agents | Mastra Docs"
description: Documentation for the createTool function in Mastra, which creates custom tools for agents and workflows.
---

# `createTool()`
[EN] Source: https://mastra.ai/en/reference/agents/createTool

The `createTool()` function creates typed tools that can be executed by agents or workflows. Tools have built-in schema validation, execution context, and integration with the Mastra ecosystem.

## Overview

Tools are a fundamental building block in Mastra that allow agents to interact with external systems, perform computations, and access data. Each tool has:

- A unique identifier
- A description that helps the AI understand when and how to use the tool
- Optional input and output schemas for validation
- An execution function that implements the tool's logic

## Example Usage

```ts filename="src/tools/stock-tools.ts" showLineNumbers copy
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Helper function to fetch stock data
const getStockPrice = async (symbol: string) => {
  const response = await fetch(
    `https://mastra-stock-data.vercel.app/api/stock-data?symbol=${symbol}`,
  );
  const data = await response.json();
  return data.prices["4. close"];
};

// Create a tool to get stock prices
export const stockPriceTool = createTool({
  id: "getStockPrice",
  description: "Fetches the current stock price for a given ticker symbol",
  inputSchema: z.object({
    symbol: z.string().describe("The stock ticker symbol (e.g., AAPL, MSFT)"),
  }),
  outputSchema: z.object({
    symbol: z.string(),
    price: z.number(),
    currency: z.string(),
    timestamp: z.string(),
  }),
  execute: async ({ context }) => {
    const price = await getStockPrice(context.symbol);

    return {
      symbol: context.symbol,
      price: parseFloat(price),
      currency: "USD",
      timestamp: new Date().toISOString(),
    };
  },
});

// Create a tool that uses the thread context
export const threadInfoTool = createTool({
  id: "getThreadInfo",
  description: "Returns information about the current conversation thread",
  inputSchema: z.object({
    includeResource: z.boolean().optional().default(false),
  }),
  execute: async ({ context, threadId, resourceId }) => {
    return {
      threadId,
      resourceId: context.includeResource ? resourceId : undefined,
      timestamp: new Date().toISOString(),
    };
  },
});
```

## API Reference

### Parameters

`createTool()` accepts a single object with the following properties:

<PropertiesTable
  content={[
    {
      name: "id",
      type: "string",
      required: true,
      description:
        "Unique identifier for the tool. This should be descriptive of the tool's function.",
    },
    {
      name: "description",
      type: "string",
      required: true,
      description:
        "Detailed description of what the tool does, when it should be used, and what inputs it requires. This helps the AI understand how to use the tool effectively.",
    },
    {
      name: "execute",
      type: "(context: ToolExecutionContext, options?: any) => Promise<any>",
      required: false,
      description:
        "Async function that implements the tool's logic. Receives the execution context and optional configuration.",
      properties: [
        {
          type: "ToolExecutionContext",
          parameters: [
            {
              name: "context",
              type: "object",
              description:
                "The validated input data that matches the inputSchema",
            },
            {
              name: "threadId",
              type: "string",
              isOptional: true,
              description:
                "Identifier for the conversation thread, if available",
            },
            {
              name: "resourceId",
              type: "string",
              isOptional: true,
              description:
                "Identifier for the user or resource interacting with the tool",
            },
            {
              name: "mastra",
              type: "Mastra",
              isOptional: true,
              description: "Reference to the Mastra instance, if available",
            },
          ],
        },
        {
          type: "ToolOptions",
          parameters: [
            {
              name: "toolCallId",
              type: "string",
              description:
                "The ID of the tool call. You can use it e.g. when sending tool-call related information with stream data.",
            },
            {
              name: "messages",
              type: "CoreMessage[]",
              description:
                "Messages that were sent to the language model to initiate the response that contained the tool call. The messages do not include the system prompt nor the assistant response that contained the tool call.",
            },
            {
              name: "abortSignal",
              type: "AbortSignal",
              isOptional: true,
              description:
                "An optional abort signal that indicates that the overall operation should be aborted.",
            },
          ],
        },
      ],
    },
    {
      name: "inputSchema",
      type: "ZodSchema",
      required: false,
      description:
        "Zod schema that defines and validates the tool's input parameters. If not provided, the tool will accept any input.",
    },
    {
      name: "outputSchema",
      type: "ZodSchema",
      required: false,
      description:
        "Zod schema that defines and validates the tool's output. Helps ensure the tool returns data in the expected format.",
    },
  ]}
/>

### Returns

<PropertiesTable
  content={[
    {
      name: "Tool",
      type: "Tool<TSchemaIn, TSchemaOut>",
      description:
        "A Tool instance that can be used with agents, workflows, or directly executed.",
      properties: [
        {
          type: "Tool",
          parameters: [
            {
              name: "id",
              type: "string",
              description: "The tool's unique identifier",
            },
            {
              name: "description",
              type: "string",
              description: "Description of the tool's functionality",
            },
            {
              name: "inputSchema",
              type: "ZodSchema | undefined",
              description: "Schema for validating inputs",
            },
            {
              name: "outputSchema",
              type: "ZodSchema | undefined",
              description: "Schema for validating outputs",
            },
            {
              name: "execute",
              type: "Function",
              description: "The tool's execution function",
            },
          ],
        },
      ],
    },
  ]}
/>

## Type Safety

The `createTool()` function provides full type safety through TypeScript generics:

- Input types are inferred from the `inputSchema`
- Output types are inferred from the `outputSchema`
- The execution context is properly typed based on the input schema

This ensures that your tools are type-safe throughout your application.

## Best Practices

1. **Descriptive IDs**: Use clear, action-oriented IDs like `getWeatherForecast` or `searchDatabase`
2. **Detailed Descriptions**: Provide comprehensive descriptions that explain when and how to use the tool
3. **Input Validation**: Use Zod schemas to validate inputs and provide helpful error messages
4. **Error Handling**: Implement proper error handling in your execute function
5. **Idempotency**: When possible, make your tools idempotent (same input always produces same output)
6. **Performance**: Keep tools lightweight and fast to execute


---
title: "Reference: Agent.generate() | Agents | Mastra Docs"
description: "Documentation for the `.generate()` method in Mastra agents, which produces text or structured responses."
---

# Agent.generate()
[EN] Source: https://mastra.ai/en/reference/agents/generate

The `generate()` method is used to interact with an agent to produce text or structured responses. This method accepts `messages` and an optional `options` object as parameters.

## Parameters

### `messages`

The `messages` parameter can be:

- A single string
- An array of strings
- An array of message objects with `role` and `content` properties

The message object structure:

```typescript
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}
```

### `options` (Optional)

An optional object that can include configuration for output structure, memory management, tool usage, telemetry, and more.

<PropertiesTable
  content={[
    {
      name: "abortSignal",
      type: "AbortSignal",
      isOptional: true,
      description:
        "Signal object that allows you to abort the agent's execution. When the signal is aborted, all ongoing operations will be terminated.",
    },
    {
      name: "context",
      type: "CoreMessage[]",
      isOptional: true,
      description: "Additional context messages to provide to the agent.",
    },
    {
      name: "experimental_output",
      type: "Zod schema | JsonSchema7",
      isOptional: true,
      description:
        "Enables structured output generation alongside text generation and tool calls. The model will generate responses that conform to the provided schema.",
    },
    {
      name: "instructions",
      type: "string",
      isOptional: true,
      description:
        "Custom instructions that override the agent's default instructions for this specific generation. Useful for dynamically modifying agent behavior without creating a new agent instance.",
    },
    {
      name: "output",
      type: "Zod schema | JsonSchema7",
      isOptional: true,
      description:
        "Defines the expected structure of the output. Can be a JSON Schema object or a Zod schema.",
    },
    {
      name: "memory",
      type: "object",
      isOptional: true,
      description: "Configuration for memory. This is the preferred way to manage memory.",
      properties: [
        {
          parameters: [{
              name: "thread",
              type: "string | { id: string; metadata?: Record<string, any>, title?: string }",
              isOptional: false,
              description: "The conversation thread, as a string ID or an object with an `id` and optional `metadata`."
          }]
        },
        {
          parameters: [{
              name: "resource",
              type: "string",
              isOptional: false,
              description: "Identifier for the user or resource associated with the thread."
          }]
        },
        {
          parameters: [{
              name: "options",
              type: "MemoryConfig",
              isOptional: true,
              description: "Configuration for memory behavior, like message history and semantic recall. See `MemoryConfig` below."
          }]
        }
      ]
    },
    {
      name: "maxSteps",
      type: "number",
      isOptional: true,
      defaultValue: "5",
      description: "Maximum number of execution steps allowed.",
    },
    {
      name: "maxRetries",
      type: "number",
      isOptional: true,
      defaultValue: "2",
      description: "Maximum number of retries. Set to 0 to disable retries.",
    },
    {
      name: "memoryOptions",
      type: "MemoryConfig",
      isOptional: true,
      description:
        "**Deprecated.** Use `memory.options` instead. Configuration options for memory management. See MemoryConfig section below for details.",
    },
    {
      name: "onStepFinish",
      type: "GenerateTextOnStepFinishCallback<any> | never",
      isOptional: true,
      description:
        "Callback function called after each execution step. Receives step details as a JSON string. Unavailable for structured output",
    },
    {
      name: "resourceId",
      type: "string",
      isOptional: true,
      description:
        "**Deprecated.** Use `memory.resource` instead. Identifier for the user or resource interacting with the agent. Must be provided if threadId is provided.",
    },
    {
      name: "telemetry",
      type: "TelemetrySettings",
      isOptional: true,
      description:
        "Settings for telemetry collection during generation. See TelemetrySettings section below for details.",
    },
    {
      name: "temperature",
      type: "number",
      isOptional: true,
      description:
        "Controls randomness in the model's output. Higher values (e.g., 0.8) make the output more random, lower values (e.g., 0.2) make it more focused and deterministic.",
    },
    {
      name: "threadId",
      type: "string",
      isOptional: true,
      description:
        "**Deprecated.** Use `memory.thread` instead. Identifier for the conversation thread. Allows for maintaining context across multiple interactions. Must be provided if resourceId is provided.",
    },
    {
      name: "toolChoice",
      type: "'auto' | 'none' | 'required' | { type: 'tool'; toolName: string }",
      isOptional: true,
      defaultValue: "'auto'",
      description: "Controls how the agent uses tools during generation.",
    },
    {
      name: "toolsets",
      type: "ToolsetsInput",
      isOptional: true,
      description:
        "Additional toolsets to make available to the agent during generation.",
    },
    {
      name: "clientTools",
      type: "ToolsInput",
      isOptional: true,
      description:
        "Tools that are executed on the 'client' side of the request. These tools do not have execute functions in the definition.",
    },
  ]}
/>

#### MemoryConfig

Configuration options for memory management:

<PropertiesTable
  content={[
    {
      name: "lastMessages",
      type: "number | false",
      isOptional: true,
      description:
        "Number of most recent messages to include in context. Set to false to disable.",
    },
    {
      name: "semanticRecall",
      type: "boolean | object",
      isOptional: true,
      description:
        "Configuration for semantic memory recall. Can be boolean or detailed config.",
      properties: [
        {
          type: "number",
          parameters: [
            {
              name: "topK",
              type: "number",
              isOptional: true,
              description:
                "Number of most semantically similar messages to retrieve.",
            },
          ],
        },
        {
          type: "number | object",
          parameters: [
            {
              name: "messageRange",
              type: "number | { before: number; after: number }",
              isOptional: true,
              description:
                "Range of messages to consider for semantic search. Can be a single number or before/after configuration.",
            },
          ],
        },
      ],
    },
    {
      name: "workingMemory",
      type: "object",
      isOptional: true,
      description: "Configuration for working memory.",
      properties: [
        {
          type: "boolean",
          parameters: [
            {
              name: "enabled",
              type: "boolean",
              isOptional: true,
              description: "Whether to enable working memory.",
            },
          ],
        },
        {
          type: "string",
          parameters: [
            {
              name: "template",
              type: "string",
              isOptional: true,
              description: "Template to use for working memory.",
            },
          ],
        },
      ],
    },
    {
      name: "threads",
      type: "object",
      isOptional: true,
      description: "Thread-specific memory configuration.",
      properties: [
        {
          type: "boolean | object",
          parameters: [
            {
              name: "generateTitle",
              type: "boolean | { model: LanguageModelV1 | ((ctx: RuntimeContext) => LanguageModelV1 | Promise<LanguageModelV1>), instructions: string | ((ctx: RuntimeContext) => string | Promise<string>) }",
              isOptional: true,
              description:
                `Controls automatic thread title generation from the user's first message. Can be a boolean to enable/disable using the agent's model, or an object specifying a custom model and/or custom instructions for title generation (useful for cost optimization or title customization).
Example: { model: openai('gpt-4.1-nano'), instructions: 'Generate a concise title based on the initial user message.' }`,
            },
          ],
        },
      ],
    },
  ]}
/>

#### TelemetrySettings

Settings for telemetry collection during generation:

<PropertiesTable
  content={[
    {
      name: "isEnabled",
      type: "boolean",
      isOptional: true,
      defaultValue: "false",
      description:
        "Enable or disable telemetry. Disabled by default while experimental.",
    },
    {
      name: "recordInputs",
      type: "boolean",
      isOptional: true,
      defaultValue: "true",
      description:
        "Enable or disable input recording. You might want to disable this to avoid recording sensitive information, reduce data transfers, or increase performance.",
    },
    {
      name: "recordOutputs",
      type: "boolean",
      isOptional: true,
      defaultValue: "true",
      description:
        "Enable or disable output recording. You might want to disable this to avoid recording sensitive information, reduce data transfers, or increase performance.",
    },
    {
      name: "functionId",
      type: "string",
      isOptional: true,
      description:
        "Identifier for this function. Used to group telemetry data by function.",
    },
    {
      name: "metadata",
      type: "Record<string, AttributeValue>",
      isOptional: true,
      description:
        "Additional information to include in the telemetry data. AttributeValue can be string, number, boolean, array of these types, or null.",
    },
    {
      name: "tracer",
      type: "Tracer",
      isOptional: true,
      description:
        "A custom OpenTelemetry tracer instance to use for the telemetry data. See OpenTelemetry documentation for details.",
    },
  ]}
/>

## Returns

The return value of the `generate()` method depends on the options provided, specifically the `output` option.

### PropertiesTable for Return Values

<PropertiesTable
  content={[
    {
      name: "text",
      type: "string",
      isOptional: true,
      description:
        "The generated text response. Present when output is 'text' (no schema provided).",
    },
    {
      name: "object",
      type: "object",
      isOptional: true,
      description:
        "The generated structured response. Present when a schema is provided via `output` or `experimental_output`.",
    },
    {
      name: "toolCalls",
      type: "Array<ToolCall>",
      isOptional: true,
      description:
        "The tool calls made during the generation process. Present in both text and object modes.",
    },
  ]}
/>

#### ToolCall Structure

<PropertiesTable
  content={[
    {
      name: "toolName",
      type: "string",
      required: true,
      description: "The name of the tool invoked.",
    },
    {
      name: "args",
      type: "any",
      required: true,
      description: "The arguments passed to the tool.",
    },
  ]}
/>

## Related Methods

For real-time streaming responses, see the [`stream()`](./stream.mdx) method documentation.


---
title: "Reference: getAgent() | Agent Config | Agents | Mastra Docs"
description: API Reference for getAgent.
---

# `getAgent()`
[EN] Source: https://mastra.ai/en/reference/agents/getAgent

Retrieve an agent based on the provided configuration

```ts showLineNumbers copy
async function getAgent({
  connectionId,
  agent,
  apis,
  logger,
}: {
  connectionId: string;
  agent: Record<string, any>;
  apis: Record<string, IntegrationApi>;
  logger: any;
}): Promise<(props: { prompt: string }) => Promise<any>> {
  return async (props: { prompt: string }) => {
    return { message: "Hello, world!" };
  };
}
```

## API Signature

### Parameters

<PropertiesTable
  content={[
    {
      name: "connectionId",
      type: "string",
      description: "The connection ID to use for the agent's API calls.",
    },
    {
      name: "agent",
      type: "Record<string, any>",
      description: "The agent configuration object.",
    },
    {
      name: "apis",
      type: "Record<string, IntegrationAPI>",
      description: "A map of API names to their respective API objects.",
    },
  ]}
/>

### Returns

<PropertiesTable content={[]} />


---
title: "Reference: Agent.getInstructions() | Agents | Mastra Docs"
description: "Documentation for the `.getInstructions()` method in Mastra agents, which retrieves the instructions that guide the agent's behavior."
---

# Agent.getInstructions()
[EN] Source: https://mastra.ai/en/reference/agents/getInstructions

The `getInstructions()` method retrieves the instructions configured for an agent, resolving them if they're a function. These instructions guide the agent's behavior and define its capabilities and constraints.

## Syntax

```typescript
getInstructions({ runtimeContext }: { runtimeContext?: RuntimeContext } = {}): string | Promise<string>
```

## Parameters

<br />
<PropertiesTable
  content={[
    {
      name: "runtimeContext",
      type: "RuntimeContext",
      isOptional: true,
      description:
        "Runtime context for dependency injection and contextual information.",
    },
  ]}
/>

## Return Value

Returns a string or a Promise that resolves to a string containing the agent's instructions.

## Description

The `getInstructions()` method is used to access the instructions that guide an agent's behavior. It resolves the instructions, which can be either directly provided as a string or returned from a function.

Instructions are a critical component of an agent's configuration as they define:

- The agent's role and personality
- Task-specific guidance
- Constraints on the agent's behavior
- Context for handling user requests

## Examples

### Basic Usage

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

// Create an agent with static instructions
const agent = new Agent({
  name: "assistant",
  instructions:
    "You are a helpful assistant that provides concise and accurate information.",
  model: openai("gpt-4o"),
});

// Get the instructions
const instructions = await agent.getInstructions();
console.log(instructions); // "You are a helpful assistant that provides concise and accurate information."
```

### Using with RuntimeContext

```typescript
import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { openai } from "@ai-sdk/openai";

// Create an agent with dynamic instructions
const agent = new Agent({
  name: "contextual-assistant",
  instructions: ({ runtimeContext }) => {
    // Dynamic instructions based on runtime context
    const userPreference = runtimeContext.get("userPreference");
    const expertise = runtimeContext.get("expertise") || "general";

    if (userPreference === "technical") {
      return `You are a technical assistant specializing in ${expertise}. Provide detailed technical explanations.`;
    }

    return `You are a helpful assistant providing easy-to-understand information about ${expertise}.`;
  },
  model: openai("gpt-4o"),
});

// Create a runtime context with user preferences
const context = new RuntimeContext();
context.set("userPreference", "technical");
context.set("expertise", "machine learning");

// Get the instructions using the runtime context
const instructions = await agent.getInstructions({ runtimeContext: context });
console.log(instructions); // "You are a technical assistant specializing in machine learning. Provide detailed technical explanations."
```


---
title: "Reference: Agent.getMemory() | Agents | Mastra Docs"
description: "Documentation for the `.getMemory()` method in Mastra agents, which retrieves the memory system associated with the agent."
---

# Agent.getMemory()
[EN] Source: https://mastra.ai/en/reference/agents/getMemory

The `getMemory()` method retrieves the memory system associated with an agent. This method is used to access the agent's memory capabilities for storing and retrieving information across conversations.

## Syntax

```typescript
getMemory(): MastraMemory | undefined
```

## Parameters

This method does not take any parameters.

## Return Value

Returns a `MastraMemory` instance if a memory system is configured for the agent, or `undefined` if no memory system is configured.

## Description

The `getMemory()` method is used to access the memory system associated with an agent. Memory systems allow agents to:

- Store and retrieve information across multiple interactions
- Maintain conversation history
- Remember user preferences and context
- Provide personalized responses based on past interactions

This method is often used in conjunction with `hasOwnMemory()` to check if an agent has a memory system before attempting to use it.

## Examples

### Basic Usage

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { openai } from "@ai-sdk/openai";

// Create a memory system
const memory = new Memory();

// Create an agent with memory
const agent = new Agent({
  name: "memory-assistant",
  instructions:
    "You are a helpful assistant that remembers previous conversations.",
  model: openai("gpt-4o"),
  memory,
});

// Get the memory system
const agentMemory = agent.getMemory();

if (agentMemory) {
  // Use the memory system to retrieve thread messages
  const thread = await agentMemory.getThreadById({
    resourceId: "user-123",
    threadId: "conversation-1",
  });

  console.log("Retrieved thread:", thread);
}
```

### Checking for Memory Before Using

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

// Create an agent without memory
const agent = new Agent({
  name: "stateless-assistant",
  instructions: "You are a helpful assistant.",
  model: openai("gpt-4o"),
});

// Check if the agent has memory before using it
if (agent.hasOwnMemory()) {
  const memory = agent.getMemory();
  // Use memory...
} else {
  console.log("This agent does not have a memory system.");
}
```

### Using Memory in a Conversation

```typescript
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { openai } from "@ai-sdk/openai";

// Create a memory system
const memory = new Memory();

// Create an agent with memory
const agent = new Agent({
  name: "memory-assistant",
  instructions:
    "You are a helpful assistant that remembers previous conversations.",
  model: openai("gpt-4o"),
  memory,
});

// First interaction - store information
await agent.generate("My name is Alice.", {
  resourceId: "user-123",
  threadId: "conversation-1",
});

// Later interaction - retrieve information
const result = await agent.generate("What's my name?", {
  resourceId: "user-123",
  threadId: "conversation-1",
});

console.log(result.text); // Should mention "Alice"

// Access the memory system directly
const agentMemory = agent.getMemory();
if (agentMemory) {
  // Retrieve messages from the thread
  const { messages } = await agentMemory.query({
    resourceId: "user-123",
    threadId: "conversation-1",
    selectBy: {
      last: 10, // Get the last 10 messages
    },
  });

  console.log("Retrieved messages:", messages);
}
```


---
title: "Reference: Agent.getModel() | Agents | Mastra Docs"
description: "Documentation for the `.getModel()` method in Mastra agents, which retrieves the language model that powers the agent."
---

# Agent.getModel()
[EN] Source: https://mastra.ai/en/reference/agents/getModel

The `getModel()` method retrieves the language model configured for an agent, resolving it if it's a function. This method is used to access the underlying model that powers the agent's capabilities.

## Syntax

```typescript
getModel({ runtimeContext = new RuntimeContext() }: { runtimeContext?: RuntimeContext } = {}): MastraLanguageModel | Promise<MastraLanguageModel>
```

## Parameters

<br />
<PropertiesTable
  content={[
    {
      name: "runtimeContext",
      type: "RuntimeContext",
      isOptional: true,
      description:
        "Runtime context for dependency injection and contextual information.",
    },
  ]}
/>

## Return Value

Returns a `MastraLanguageModel` instance or a Promise that resolves to a `MastraLanguageModel` instance.

## Description

The `getModel()` method is used to access the language model that powers an agent. It resolves the model, which can be either directly provided or returned from a function.

The language model is a crucial component of an agent as it determines:

- The quality and capabilities of the agent's responses
- The available features (like function calling, structured output, etc.)
- The cost and performance characteristics of the agent

## Examples

### Basic Usage

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

// Create an agent with a static model
const agent = new Agent({
  name: "assistant",
  instructions: "You are a helpful assistant.",
  model: openai("gpt-4o"),
});

// Get the model
const model = await agent.getModel();
console.log(model.id); // "gpt-4o"
```

### Using with RuntimeContext

```typescript
import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

// Create an agent with dynamic model selection
const agent = new Agent({
  name: "dynamic-model-assistant",
  instructions: "You are a helpful assistant.",
  model: ({ runtimeContext }) => {
    // Dynamic model selection based on runtime context
    const preferredProvider = runtimeContext.get("preferredProvider");
    const highQuality = runtimeContext.get("highQuality") === true;

    if (preferredProvider === "anthropic") {
      return highQuality
        ? anthropic("claude-3-opus")
        : anthropic("claude-3-sonnet");
    }

    // Default to OpenAI
    return highQuality ? openai("gpt-4o") : openai("gpt-4.1-nano");
  },
});

// Create a runtime context with preferences
const context = new RuntimeContext();
context.set("preferredProvider", "anthropic");
context.set("highQuality", true);

// Get the model using the runtime context
const model = await agent.getModel({ runtimeContext: context });
console.log(model.id); // "claude-3-opus"
```


---
title: "Reference: Agent.getTools() | Agents | Mastra Docs"
description: "Documentation for the `.getTools()` method in Mastra agents, which retrieves the tools that the agent can use."
---

# Agent.getTools()
[EN] Source: https://mastra.ai/en/reference/agents/getTools

The `getTools()` method retrieves the tools configured for an agent, resolving them if they're a function. These tools extend the agent's capabilities, allowing it to perform specific actions or access external systems.

## Syntax

```typescript
getTools({ runtimeContext = new RuntimeContext() }: { runtimeContext?: RuntimeContext } = {}): ToolsInput | Promise<ToolsInput>
```

## Parameters

<br />
<PropertiesTable
  content={[
    {
      name: "runtimeContext",
      type: "RuntimeContext",
      isOptional: true,
      description:
        "Runtime context for dependency injection and contextual information.",
    },
  ]}
/>

## Return Value

Returns a `ToolsInput` object or a Promise that resolves to a `ToolsInput` object containing the agent's tools.

## Description

The `getTools()` method is used to access the tools that an agent can use. It resolves the tools, which can be either directly provided as an object or returned from a function.

Tools are a key component of an agent's capabilities, allowing it to:

- Perform specific actions (like fetching data or making calculations)
- Access external systems and APIs
- Execute code or commands
- Interact with databases or other services

## Examples

### Basic Usage

```typescript
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Create tools using createTool
const addTool = createTool({
  id: "add",
  description: "Add two numbers",
  inputSchema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
  outputSchema: z.number(),
  execute: async ({ context }) => {
    return context.a + context.b;
  },
});

const multiplyTool = createTool({
  id: "multiply",
  description: "Multiply two numbers",
  inputSchema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
  outputSchema: z.number(),
  execute: async ({ context }) => {
    return context.a * context.b;
  },
});

// Create an agent with the tools
const agent = new Agent({
  name: "calculator",
  instructions:
    "You are a calculator assistant that can perform mathematical operations.",
  model: openai("gpt-4o"),
  tools: {
    add: addTool,
    multiply: multiplyTool,
  },
});

// Get the tools
const tools = await agent.getTools();
console.log(Object.keys(tools)); // ["add", "multiply"]
```

### Using with RuntimeContext

```typescript
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Create an agent with dynamic tools
const agent = new Agent({
  name: "weather-assistant",
  instructions:
    "You are a weather assistant that can provide weather information.",
  model: openai("gpt-4o"),
  tools: ({ runtimeContext }) => {
    // Get API key from runtime context
    const apiKey = runtimeContext.get("weatherApiKey");

    // Create a weather tool with the API key from context
    const weatherTool = createTool({
      id: "getWeather",
      description: "Get the current weather for a location",
      inputSchema: z.object({
        location: z.string().describe("City name"),
      }),
      outputSchema: z.object({
        temperature: z.number(),
        conditions: z.string(),
        humidity: z.number(),
        windSpeed: z.number(),
      }),
      execute: async ({ context }) => {
        // Use the API key from runtime context
        const response = await fetch(
          `https://api.weather.com/current?location=${context.location}&apiKey=${apiKey}`,
        );
        return response.json();
      },
    });

    return {
      getWeather: weatherTool,
    };
  },
});

// Create a runtime context with API key
const context = new RuntimeContext();
context.set("weatherApiKey", "your-api-key");

// Get the tools using the runtime context
const tools = await agent.getTools({ runtimeContext: context });
console.log(Object.keys(tools)); // ["getWeather"]
```


---
title: "Reference: Agent.getVoice() | Agents | Mastra Docs"
description: "Documentation for the `.getVoice()` method in Mastra agents, which retrieves the voice provider for speech capabilities."
---

# Agent.getVoice()
[EN] Source: https://mastra.ai/en/reference/agents/getVoice

The `getVoice()` method retrieves the voice provider configured for an agent, resolving it if it's a function. This method is used to access the agent's speech capabilities for text-to-speech and speech-to-text functionality.

## Syntax

```typescript
getVoice({ runtimeContext }: { runtimeContext?: RuntimeContext } = {}): CompositeVoice | Promise<CompositeVoice>
```

## Parameters

<br />
<PropertiesTable
  content={[
    {
      name: "runtimeContext",
      type: "RuntimeContext",
      isOptional: true,
      description:
        "Runtime context for dependency injection and contextual information. Defaults to a new RuntimeContext instance if not provided.",
    },
  ]}
/>

## Return Value

Returns a `CompositeVoice` instance or a Promise that resolves to a `CompositeVoice` instance. If no voice provider was configured for the agent, it returns a default voice provider.

## Description

The `getVoice()` method is used to access the voice capabilities of an agent. It resolves the voice provider, which can be either directly provided or returned from a function.

The voice provider enables:

- Text-to-speech conversion (speaking)
- Speech-to-text conversion (listening)
- Retrieving available speakers/voices

## Examples

### Basic Usage

```typescript
import { Agent } from "@mastra/core/agent";
import { ElevenLabsVoice } from "@mastra/voice-elevenlabs";
import { openai } from "@ai-sdk/openai";

// Create an agent with a voice provider
const agent = new Agent({
  name: "voice-assistant",
  instructions: "You are a helpful voice assistant.",
  model: openai("gpt-4o"),
  voice: new ElevenLabsVoice({
    apiKey: process.env.ELEVENLABS_API_KEY,
  }),
});

// Get the voice provider
const voice = await agent.getVoice();

// Use the voice provider for text-to-speech
const audioStream = await voice.speak("Hello, how can I help you today?");

// Use the voice provider for speech-to-text
const transcription = await voice.listen(audioStream);

// Get available speakers
const speakers = await voice.getSpeakers();
console.log(speakers);
```

### Using with RuntimeContext

```typescript
import { Agent } from "@mastra/core/agent";
import { ElevenLabsVoice } from "@mastra/voice-elevenlabs";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { openai } from "@ai-sdk/openai";

// Create an agent with a dynamic voice provider
const agent = new Agent({
  name: "voice-assistant",
  instructions: ({ runtimeContext }) => {
    // Dynamic instructions based on runtime context
    const instructions = runtimeContext.get("preferredVoiceInstructions");
    return instructions || "You are a helpful voice assistant.";
  },
  model: openai("gpt-4o"),
  voice: new ElevenLabsVoice({
    apiKey: process.env.ELEVENLABS_API_KEY,
  }),
});

// Create a runtime context with preferences
const context = new RuntimeContext();
context.set("preferredVoiceInstructions", "You are an evil voice assistant");

// Get the voice provider using the runtime context
const voice = await agent.getVoice({ runtimeContext: context });

// Use the voice provider
const audioStream = await voice.speak("Hello, how can I help you today?");
```


---
title: "Reference: Agent.getWorkflows() | Agents | Mastra Docs"
description: "Documentation for the `.getWorkflows()` method in Mastra agents, which retrieves the workflows that the agent can execute."
---

# Agent.getWorkflows()
[EN] Source: https://mastra.ai/en/reference/agents/getWorkflows

The `getWorkflows()` method retrieves the workflows configured for an agent, resolving them if they're a function. These workflows enable the agent to execute complex, multi-step processes with defined execution paths.

## Syntax

```typescript
getWorkflows({ runtimeContext = new RuntimeContext() }: { runtimeContext?: RuntimeContext } = {}): Record<string, NewWorkflow> | Promise<Record<string, NewWorkflow>>
```

## Parameters

<br />
<PropertiesTable
  content={[
    {
      name: "runtimeContext",
      type: "RuntimeContext",
      isOptional: true,
      description:
        "Runtime context for dependency injection and contextual information.",
    },
  ]}
/>

## Return Value

Returns a `Record<string, NewWorkflow>` object or a Promise that resolves to a `Record<string, NewWorkflow>` object containing the agent's workflows.

## Description

The `getWorkflows()` method is used to access the workflows that an agent can execute. It resolves the workflows, which can be either directly provided as an object or returned from a function that receives runtime context.

## Examples

```typescript
import { Agent } from "@mastra/core/agent";
import { createWorkflow, createStep } from "@mastra/core/workflows";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const generateSuggestionsStep = createStep({
  id: "generate-suggestions",
  inputSchema: z.object({
    topic: z.string().describe("The topic to research"),
  }),
  outputSchema: z.object({
    summary: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const researchAgent = mastra?.getAgent("researchAgent");

    if (!researchAgent) {
      throw new Error("Research agent is not initialized");
    }

    const { topic } = inputData;

    const result = await researchAgent.generate([
      { role: "assistant", content: topic },
    ]);

    return { summary: result.text };
  },
});

const researchWorkflow = createWorkflow({
  id: "research-workflow",
  inputSchema: z.object({
    topic: z.string().describe("The topic to research"),
  }),
  outputSchema: z.object({
    summary: z.string(),
  }),
});

researchWorkflow.then(generateSuggestionsStep).commit();

// Create an agent with the workflow
const agent = new Agent({
  name: "research-organizer",
  instructions:
    "You are a research organizer that can delegate tasks to gather information and create summaries.",
  model: openai("gpt-4o"),
  workflows: {
    research: researchWorkflow,
  },
});

// Get the workflows
const workflows = await agent.getWorkflows();

console.log(Object.keys(workflows)); // ["research"]
```


---
title: "Reference: Agent.stream() | Streaming | Agents | Mastra Docs"
description: Documentation for the `.stream()` method in Mastra agents, which enables real-time streaming of responses.
---

# `stream()`
[EN] Source: https://mastra.ai/en/reference/agents/stream

The `stream()` method enables real-time streaming of responses from an agent. This method accepts `messages` and an optional `options` object as parameters, similar to `generate()`.

## Parameters

### `messages`

The `messages` parameter can be:

- A single string
- An array of strings
- An array of message objects with `role` and `content` properties

The message object structure:

```typescript
interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}
```

### `options` (Optional)

An optional object that can include configuration for output structure, memory management, tool usage, telemetry, and more.

<PropertiesTable
  content={[
    {
      name: "abortSignal",
      type: "AbortSignal",
      isOptional: true,
      description:
        "Signal object that allows you to abort the agent's execution. When the signal is aborted, all ongoing operations will be terminated.",
    },
    {
      name: "context",
      type: "CoreMessage[]",
      isOptional: true,
      description: "Additional context messages to provide to the agent.",
    },
    {
      name: "experimental_output",
      type: "Zod schema | JsonSchema7",
      isOptional: true,
      description:
        "Enables structured output generation alongside text generation and tool calls. The model will generate responses that conform to the provided schema.",
    },
    {
      name: "instructions",
      type: "string",
      isOptional: true,
      description:
        "Custom instructions that override the agent's default instructions for this specific generation. Useful for dynamically modifying agent behavior without creating a new agent instance.",
    },
    {
      name: "memory",
      type: "object",
      isOptional: true,
      description: "Configuration for memory. This is the preferred way to manage memory.",
      properties: [
        {
          parameters: [{
              name: "thread",
              type: "string | { id: string; metadata?: Record<string, any>, title?: string }",
              isOptional: false,
              description: "The conversation thread, as a string ID or an object with an `id` and optional `metadata`."
          }]
        },
        {
          parameters: [{
              name: "resource",
              type: "string",
              isOptional: false,
              description: "Identifier for the user or resource associated with the thread."
          }]
        },
        {
          parameters: [{
              name: "options",
              type: "MemoryConfig",
              isOptional: true,
              description: "Configuration for memory behavior, like message history and semantic recall. See `MemoryConfig` below."
          }]
        }
      ]
    },
    {
      name: "maxSteps",
      type: "number",
      isOptional: true,
      defaultValue: "5",
      description: "Maximum number of steps allowed during streaming.",
    },
    {
      name: "maxRetries",
      type: "number",
      isOptional: true,
      defaultValue: "2",
      description: "Maximum number of retries. Set to 0 to disable retries.",
    },
    {
      name: "memoryOptions",
      type: "MemoryConfig",
      isOptional: true,
      description:
        "**Deprecated.** Use `memory.options` instead. Configuration options for memory management. See MemoryConfig section below for details.",
    },
    {
      name: "onFinish",
      type: "StreamTextOnFinishCallback | StreamObjectOnFinishCallback",
      isOptional: true,
      description: "Callback function called when streaming is complete.",
    },
    {
      name: "onStepFinish",
      type: "GenerateTextOnStepFinishCallback<any> | never",
      isOptional: true,
      description:
        "Callback function called after each step during streaming. Unavailable for structured output",
    },
    {
      name: "output",
      type: "Zod schema | JsonSchema7",
      isOptional: true,
      description:
        "Defines the expected structure of the output. Can be a JSON Schema object or a Zod schema.",
    },
    {
      name: "resourceId",
      type: "string",
      isOptional: true,
      description:
        "**Deprecated.** Use `memory.resource` instead. Identifier for the user or resource interacting with the agent. Must be provided if threadId is provided.",
    },
    {
      name: "telemetry",
      type: "TelemetrySettings",
      isOptional: true,
      description:
        "Settings for telemetry collection during streaming. See TelemetrySettings section below for details.",
    },
    {
      name: "temperature",
      type: "number",
      isOptional: true,
      description:
        "Controls randomness in the model's output. Higher values (e.g., 0.8) make the output more random, lower values (e.g., 0.2) make it more focused and deterministic.",
    },
    {
      name: "threadId",
      type: "string",
      isOptional: true,
      description:
        "**Deprecated.** Use `memory.thread` instead. Identifier for the conversation thread. Allows for maintaining context across multiple interactions. Must be provided if resourceId is provided.",
    },
    {
      name: "toolChoice",
      type: "'auto' | 'none' | 'required' | { type: 'tool'; toolName: string }",
      isOptional: true,
      defaultValue: "'auto'",
      description: "Controls how the agent uses tools during streaming.",
    },
    {
      name: "toolsets",
      type: "ToolsetsInput",
      isOptional: true,
      description:
        "Additional toolsets to make available to the agent during this stream.",
    },
    {
      name: "clientTools",
      type: "ToolsInput",
      isOptional: true,
      description:
        "Tools that are executed on the 'client' side of the request. These tools do not have execute functions in the definition.",
    },
  ]}
/>

#### MemoryConfig

Configuration options for memory management:

<PropertiesTable
  content={[
    {
      name: "lastMessages",
      type: "number | false",
      isOptional: true,
      description:
        "Number of most recent messages to include in context. Set to false to disable.",
    },
    {
      name: "semanticRecall",
      type: "boolean | object",
      isOptional: true,
      description:
        "Configuration for semantic memory recall. Can be boolean or detailed config.",
      properties: [
        {
          type: "number",
          parameters: [
            {
              name: "topK",
              type: "number",
              isOptional: true,
              description:
                "Number of most semantically similar messages to retrieve.",
            },
          ],
        },
        {
          type: "number | object",
          parameters: [
            {
              name: "messageRange",
              type: "number | { before: number; after: number }",
              isOptional: true,
              description:
                "Range of messages to consider for semantic search. Can be a single number or before/after configuration.",
            },
          ],
        },
      ],
    },
    {
      name: "workingMemory",
      type: "object",
      isOptional: true,
      description: "Configuration for working memory.",
      properties: [
        {
          type: "boolean",
          parameters: [
            {
              name: "enabled",
              type: "boolean",
              isOptional: true,
              description: "Whether to enable working memory.",
            },
          ],
        },
        {
          type: "string",
          parameters: [
            {
              name: "template",
              type: "string",
              isOptional: true,
              description: "Template to use for working memory.",
            },
          ],
        },
      ],
    },
    {
      name: "threads",
      type: "object",
      isOptional: true,
      description: "Thread-specific memory configuration.",
      properties: [
        {
          type: "boolean | object",
          parameters: [
            {
              name: "generateTitle",
              type: "boolean | { model: LanguageModelV1 | ((ctx: RuntimeContext) => LanguageModelV1 | Promise<LanguageModelV1>), instructions: string | ((ctx: RuntimeContext) => string | Promise<string>) }",
              isOptional: true,
              description:
                `Controls automatic thread title generation from the user's first message. Can be a boolean to enable/disable using the agent's model, or an object specifying a custom model and/or custom instructions for title generation (useful for cost optimization or title customization).
Example: { model: openai('gpt-4.1-nano'), instructions: 'Generate a concise title based on the initial user message.' }`,
            },
          ],
        },
      ],
    },
  ]}
/>

#### TelemetrySettings

Settings for telemetry collection during streaming:

<PropertiesTable
  content={[
    {
      name: "isEnabled",
      type: "boolean",
      isOptional: true,
      defaultValue: "false",
      description:
        "Enable or disable telemetry. Disabled by default while experimental.",
    },
    {
      name: "recordInputs",
      type: "boolean",
      isOptional: true,
      defaultValue: "true",
      description:
        "Enable or disable input recording. You might want to disable this to avoid recording sensitive information, reduce data transfers, or increase performance.",
    },
    {
      name: "recordOutputs",
      type: "boolean",
      isOptional: true,
      defaultValue: "true",
      description:
        "Enable or disable output recording. You might want to disable this to avoid recording sensitive information, reduce data transfers, or increase performance.",
    },
    {
      name: "functionId",
      type: "string",
      isOptional: true,
      description:
        "Identifier for this function. Used to group telemetry data by function.",
    },
    {
      name: "metadata",
      type: "Record<string, AttributeValue>",
      isOptional: true,
      description:
        "Additional information to include in the telemetry data. AttributeValue can be string, number, boolean, array of these types, or null.",
    },
    {
      name: "tracer",
      type: "Tracer",
      isOptional: true,
      description:
        "A custom OpenTelemetry tracer instance to use for the telemetry data. See OpenTelemetry documentation for details.",
    },
  ]}
/>

## Returns

The return value of the `stream()` method depends on the options provided, specifically the `output` option.

### PropertiesTable for Return Values

<PropertiesTable
  content={[
    {
      name: "textStream",
      type: "AsyncIterable<string>",
      isOptional: true,
      description:
        "Stream of text chunks. Present when output is 'text' (no schema provided) or when using `experimental_output`.",
    },
    {
      name: "objectStream",
      type: "AsyncIterable<object>",
      isOptional: true,
      description:
        "Stream of structured data. Present only when using `output` option with a schema.",
    },
    {
      name: "partialObjectStream",
      type: "AsyncIterable<object>",
      isOptional: true,
      description:
        "Stream of structured data. Present only when using `experimental_output` option.",
    },
    {
      name: "object",
      type: "Promise<object>",
      isOptional: true,
      description:
        "Promise that resolves to the final structured output. Present when using either `output` or `experimental_output` options.",
    },
  ]}
/>

## Examples

### Basic Text Streaming

```typescript
const stream = await myAgent.stream([
  { role: "user", content: "Tell me a story." },
]);

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Structured Output Streaming with Thread Context

```typescript
const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    nextSteps: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "nextSteps"],
};

const response = await myAgent.stream("What should we do next?", {
  output: schema,
  threadId: "project-123",
  onFinish: (text) => console.log("Finished:", text),
});

for await (const chunk of response.textStream) {
  console.log(chunk);
}

const result = await response.object;
console.log("Final structured result:", result);
```

The key difference between Agent's `stream()` and LLM's `stream()` is that Agents maintain conversation context through `threadId`, can access tools, and integrate with the agent's memory system.


---
title: "mastra build | Production Bundle | Mastra CLI"
description: "Build your Mastra project for production deployment"
---

# mastra build
[EN] Source: https://mastra.ai/en/reference/cli/build

The `mastra build` command bundles your Mastra project into a production-ready Hono server. Hono is a lightweight, type-safe web framework that makes it easy to deploy Mastra agents as HTTP endpoints with middleware support.

## Usage

```bash
mastra build [options]
```

## Options

<PropertiesTable
  content={[
    {
      name: "--dir",
      type: "string",
      description: "Path to your Mastra Folder",
      isOptional: true,
    },
    {
      name: "--root",
      type: "string",
      description: "Path to your root folder",
      isOptional: true,
    },
    {
      name: "--tools",
      type: "string",
      description: "Comma-separated list of paths to tool files to include",
      isOptional: true,
    },
    {
      name: "--env",
      type: "string", 
      description: "Path to custom environment file",
      isOptional: true,
    },
    {
      name: "--help",
      type: "boolean",
      description: "display help for command",
      isOptional: true,
    },
  ]}
/>

## Advanced usage

### Limit parallelism

For CI or when running in resource constrained environments you can cap
how many expensive tasks run at once by setting `MASTRA_CONCURRENCY`.

```bash copy
MASTRA_CONCURRENCY=2 mastra build
```

Unset it to allow the CLI to base concurrency on the host capabilities.

### Disable telemetry

To opt out of anonymous build analytics set:

```bash copy
MASTRA_TELEMETRY_DISABLED=1 mastra build
```

### Custom provider endpoints

Build time respects the same `OPENAI_BASE_URL` and `ANTHROPIC_BASE_URL`
variables that `mastra dev` does. They are forwarded by the AI SDK to
any workflows or tools that call the providers.

## What It Does

1. Locates your Mastra entry file (either `src/mastra/index.ts` or `src/mastra/index.js`)
2. Creates a `.mastra` output directory
3. Bundles your code using Rollup with:
   - Tree shaking for optimal bundle size
   - Node.js environment targeting
   - Source map generation for debugging

## Example

```bash copy
# Build from current directory
mastra build

# Build from specific directory
mastra build --dir ./my-mastra-project
```

## Output

The command generates a production bundle in the `.mastra` directory, which includes:

- A Hono-based HTTP server with your Mastra agents exposed as endpoints
- Bundled JavaScript files optimized for production
- Source maps for debugging
- Required dependencies

This output is suitable for:

- Deploying to cloud servers (EC2, Digital Ocean)
- Running in containerized environments
- Using with container orchestration systems

## Deployers

When a Deployer is used, the build output is automatically prepared for the target platform e.g

- [Vercel Deployer](/reference/deployer/vercel)
- [Netlify Deployer](/reference/deployer/netlify)
- [Cloudflare Deployer](/reference/deployer/cloudflare)


---
title: "create-mastra | Create Project | Mastra CLI"
description: Documentation for the create-mastra command, which creates a new Mastra project with interactive setup options.
---

# create-mastra
[EN] Source: https://mastra.ai/en/reference/cli/create-mastra

The `create-mastra` command **creates** a new standalone Mastra project. Use this command to scaffold a complete Mastra setup in a dedicated directory.

## Usage

```bash
create-mastra [options]
```

## Options

<PropertiesTable
  content={[
    {
      name: "--version",
      type: "boolean",
      description: "Output the version number",
      isOptional: true,
    },
    {
      name: "--project-name",
      type: "string",
      description:
        "Project name that will be used in package.json and as the project directory name",
      isOptional: true,
    },
    {
      name: "--default",
      type: "boolean",
      description: "Quick start with defaults(src, OpenAI, no examples)",
      isOptional: true,
    },
    {
      name: "--components",
      type: "string",
      description:
        "Comma-separated list of components (agents, tools, workflows)",
      isOptional: true,
    },
    {
      name: "--llm",
      type: "string",
      description:
        "Default model provider (openai, anthropic, groq, google, or cerebras)",
      isOptional: true,
    },
    {
      name: "--llm-api-key",
      type: "string",
      description: "API key for the model provider",
      isOptional: true,
    },
    {
      name: "--example",
      type: "boolean",
      description: "Include example code",
      isOptional: true,
    },
    {
      name: "--no-example",
      type: "boolean",
      description: "Do not include example code",
      isOptional: true,
    },
    {
      name: "--timeout",
      type: "number",
      description:
        "Configurable timeout for package installation, defaults to 60000 ms",
      isOptional: true,
    },
    {
      name: "--dir",
      type: "string",
      description: "Target directory for Mastra source code (default: src/)",
      isOptional: true,
    },
    {
      name: "--mcp",
      type: "string",
      description:
        "MCP Server for code editor (cursor, cursor-global, windsurf, vscode)",
      isOptional: true,
    },
    {
      name: "--help",
      type: "boolean",
      description: "Display help for command",
      isOptional: true,
    },
  ]}
/>


---
title: "mastra dev | Development Server | Mastra CLI"
description: Documentation for the mastra dev command, which starts a development server for agents, tools, and workflows.
---

# mastra dev
[EN] Source: https://mastra.ai/en/reference/cli/dev

The `mastra dev` command starts a development server that exposes REST endpoints for your agents, tools, and workflows.

## Usage

```bash
mastra dev [options]
```

## Options

<PropertiesTable
  content={[
    {
      name: "--dir",
      type: "string",
      description: "Path to your mastra folder",
      isOptional: true,
    },
    {
      name: "--root",
      type: "string",
      description: "Path to your root folder",
      isOptional: true,
    },
    {
      name: "--tools",
      type: "string",
      description: "Comma-separated list of paths to tool files to include",
      isOptional: true,
    },
    {
      name: "--port",
      type: "number",
      description:
        "deprecated: Port number for the development server (defaults to 5000)",
      isOptional: true,
    },
    {
      name: "--env",
      type: "string",
      description: "Path to custom environment file",
      isOptional: true,
    },
    {
      name: "--inspect",
      type: "boolean",
      description: "Start the dev server in inspect mode for debugging (cannot be used with --inspect-brk)",
      isOptional: true,
    },
    {
      name: "--inspect-brk",
      type: "boolean",
      description: "Start the dev server in inspect mode and break at the beginning of the script (cannot be used with --inspect)",
      isOptional: true,
    },
    {
      name: "--help",
      type: "boolean",
      description: "display help for command",
      isOptional: true,
    },
  ]}
/>

## Routes

Starting the server with `mastra dev` exposes a set of REST routes by default:

### System Routes

- **GET `/api`**: Get API status.

### Agent Routes

Agents are expected to be exported from `src/mastra/agents`.

- **GET `/api/agents`**: Lists the registered agents found in your Mastra folder.
- **GET `/api/agents/:agentId`**: Get agent by ID.
- **GET `/api/agents/:agentId/evals/ci`**: Get CI evals by agent ID.
- **GET `/api/agents/:agentId/evals/live`**: Get live evals by agent ID.
- **POST `/api/agents/:agentId/generate`**: Sends a text-based prompt to the specified agent, returning the agent's response.
- **POST `/api/agents/:agentId/stream`**: Stream a response from an agent.
- **POST `/api/agents/:agentId/instructions`**: Update an agent's instructions.
- **POST `/api/agents/:agentId/instructions/enhance`**: Generate an improved system prompt from instructions.
- **GET `/api/agents/:agentId/speakers`**: Get available speakers for an agent.
- **POST `/api/agents/:agentId/speak`**: Convert text to speech using the agent's voice provider.
- **POST `/api/agents/:agentId/listen`**: Convert speech to text using the agent's voice provider.
- **POST `/api/agents/:agentId/tools/:toolId/execute`**: Execute a tool through an agent.

### Tool Routes

Tools are expected to be exported from `src/mastra/tools` (or the configured tools directory).

- **GET `/api/tools`**: Get all tools.
- **GET `/api/tools/:toolId`**: Get tool by ID.
- **POST `/api/tools/:toolId/execute`**: Invokes a specific tool by name, passing input data in the request body.

### Workflow Routes

Workflows are expected to be exported from `src/mastra/workflows` (or the configured workflows directory).

- **GET `/api/workflows`**: Get all workflows.
- **GET `/api/workflows/:workflowId`**: Get workflow by ID.
- **POST `/api/workflows/:workflowName/start`**: Starts the specified workflow.
- **POST `/api/workflows/:workflowName/:instanceId/event`**: Sends an event or trigger signal to an existing workflow instance.
- **GET `/api/workflows/:workflowName/:instanceId/status`**: Returns status info for a running workflow instance.
- **POST `/api/workflows/:workflowId/resume`**: Resume a suspended workflow step.
- **POST `/api/workflows/:workflowId/resume-async`**: Resume a suspended workflow step asynchronously.
- **POST `/api/workflows/:workflowId/createRun`**: Create a new workflow run.
- **POST `/api/workflows/:workflowId/start-async`**: Execute/Start a workflow asynchronously.
- **GET `/api/workflows/:workflowId/watch`**: Watch workflow transitions in real-time.

### Memory Routes

- **GET `/api/memory/status`**: Get memory status.
- **GET `/api/memory/threads`**: Get all threads.
- **GET `/api/memory/threads/:threadId`**: Get thread by ID.
- **GET `/api/memory/threads/:threadId/messages`**: Get messages for a thread.
- **POST `/api/memory/threads`**: Create a new thread.
- **PATCH `/api/memory/threads/:threadId`**: Update a thread.
- **DELETE `/api/memory/threads/:threadId`**: Delete a thread.
- **POST `/api/memory/save-messages`**: Save messages.

### Telemetry Routes

- **GET `/api/telemetry`**: Get all traces.

### Log Routes

- **GET `/api/logs`**: Get all logs.
- **GET `/api/logs/transports`**: List of all log transports.
- **GET `/api/logs/:runId`**: Get logs by run ID.

### Vector Routes

- **POST `/api/vector/:vectorName/upsert`**: Upsert vectors into an index.
- **POST `/api/vector/:vectorName/create-index`**: Create a new vector index.
- **POST `/api/vector/:vectorName/query`**: Query vectors from an index.
- **GET `/api/vector/:vectorName/indexes`**: List all indexes for a vector store.
- **GET `/api/vector/:vectorName/indexes/:indexName`**: Get details about a specific index.
- **DELETE `/api/vector/:vectorName/indexes/:indexName`**: Delete a specific index.

### OpenAPI Specification

- **GET `/openapi.json`**: Returns an auto-generated OpenAPI specification for your project's routes.
- **GET `/swagger-ui`**: Access Swagger UI for API documentation.

## Additional Notes

The port defaults to 5000. Both the port and hostname can be configured via the mastra server config. See [Launch Development Server](/docs/server-db/local-dev-playground) for configuration details.

Make sure you have your environment variables set up in your `.env.development` or `.env` file for any providers you use (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.).

Make sure the `index.ts` file in your Mastra folder exports the Mastra instance for the dev server to read.

### Example request

To test an agent after running `mastra dev`:

```bash copy
curl -X POST http://localhost:5000/api/agents/myAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Hello, how can you assist me today?" }
    ]
  }'
```

## Advanced usage

The `mastra dev` server obeys a few extra environment variables that can
be handy during development:

### Disable build caching

Set `MASTRA_DEV_NO_CACHE=1` to force a full rebuild rather than using
the cached assets under `.mastra/`:

```bash copy
MASTRA_DEV_NO_CACHE=1 mastra dev
```

This helps when you are debugging bundler plugins or suspect stale
output.

### Limit parallelism

`MASTRA_CONCURRENCY` caps how many expensive operations run in parallel
(primarily build and evaluation steps). For example:

```bash copy
MASTRA_CONCURRENCY=4 mastra dev
```

Leave it unset to let the CLI pick a sensible default for the machine.

### Custom provider endpoints

When using providers supported by the Vercel AI SDK you can redirect
requests through proxies or internal gateways by setting a base URL. For
OpenAI:

```bash copy
OPENAI_API_KEY=<your-api-key> \
OPENAI_BASE_URL=https://openrouter.example/v1 \
mastra dev
```

and for Anthropic:

```bash copy
OPENAI_API_KEY=<your-api-key> \
ANTHROPIC_BASE_URL=https://anthropic.internal \
mastra dev
```

These are forwarded by the AI SDK and work with any `openai()` or
`anthropic()` calls.

### Disable telemetry

To opt out of anonymous CLI analytics set
`MASTRA_TELEMETRY_DISABLED=1`. This also prevents tracking within the
local playground.

```bash copy
MASTRA_TELEMETRY_DISABLED=1 mastra dev
```


---
title: "mastra init | Initialize Project | Mastra CLI"
description: Documentation for the mastra init command, which creates a new Mastra project with interactive setup options.
---

# mastra init
[EN] Source: https://mastra.ai/en/reference/cli/init

The `mastra init` command **initializes** Mastra in an existing project. Use this command to scaffold the necessary folders and configuration without generating a new project.

## Usage

```bash
mastra init [options]
```

## Options

<PropertiesTable
  content={[
    {
      name: "--default",
      type: "boolean",
      description: "Quick start with defaults (src, OpenAI, no examples)",
      isOptional: true,
    },
    {
      name: "--dir",
      type: "string",
      description: "Directory for Mastra files (defaults to src/)",
      isOptional: false,
    },
    {
      name: "--components",
      type: "string",
      description:
        "Comma-separated list of components (agents, tools, workflows)",
      isOptional: false,
    },
    {
      name: "--llm",
      type: "string",
      description:
        "Default model provider (openai, anthropic, groq, google or cerebras)",
      isOptional: false,
    },
    {
      name: "--llm-api-key",
      type: "string",
      description: "API key for the model provider",
      isOptional: false,
    },
    {
      name: "--example",
      type: "boolean",
      description: "Include example code",
      isOptional: true,
    },
    {
      name: "--no-example",
      type: "boolean",
      description: "Do not include example code",
      isOptional: true,
    },
    {
      name: "--mcp",
      type: "string",
      description:
        "MCP Server for code editor (cursor, cursor-global, windsurf, vscode)",
      isOptional: false,
    },
    {
      name: "--help",
      type: "boolean",
      description: "Display help for command",
      isOptional: true,
    },
  ]}
/>

## Advanced usage

### Disable analytics

If you prefer not to send anonymous usage data then set the
`MASTRA_TELEMETRY_DISABLED=1` environment variable when running the
command:

```bash copy
MASTRA_TELEMETRY_DISABLED=1 mastra init
```

### Custom provider endpoints

Initialized projects respect the `OPENAI_BASE_URL` and
`ANTHROPIC_BASE_URL` variables if present. This lets you route provider
traffic through proxies or private gateways when starting the dev server
later on.


---
title: "mastra lint | Validate Project | Mastra CLI"
description: "Lint your Mastra project"
---

# mastra lint
[EN] Source: https://mastra.ai/en/reference/cli/lint

The `mastra lint` command validates the structure and code of your Mastra project to ensure it follows best practices and is error-free.

## Usage

```bash
mastra lint [options]
```

## Options

<PropertiesTable
  content={[
    {
      name: "--dir",
      type: "string",
      description: "Path to your Mastra folder",
      isOptional: true,
    },
    {
      name: "--root",
      type: "string",
      description: "Path to your root folder",
      isOptional: true,
    },
    {
      name: "--tools",
      type: "string",
      description: "Comma-separated list of paths to tool files to include",
      isOptional: true,
    },
    {
      name: "--help",
      type: "boolean",
      description: "display help for command",
      isOptional: true,
    },
  ]}
/>

## Advanced usage

### Disable telemetry

To disable CLI analytics while running linting (and other commands) set
`MASTRA_TELEMETRY_DISABLED=1`:

```bash copy
MASTRA_TELEMETRY_DISABLED=1 mastra lint
```


---
title: 'mastra start'
description: 'Start your built Mastra application'
---

# mastra start
[EN] Source: https://mastra.ai/en/reference/cli/start

Start your built Mastra application. This command is used to run your built Mastra application in production mode.
Telemetry is enabled by default.

## Usage
After building your project with `mastra build` run:

```bash
mastra start [options]
```

## Options

| Option | Description |
|--------|-------------|
| `-d, --dir <path>` | Path to your built Mastra output directory (default: .mastra/output) |
| `-nt, --no-telemetry` | Enable OpenTelemetry instrumentation for observability |

## Examples

Start the application with default settings:

```bash
mastra start
```

Start from a custom output directory:

```bash
mastra start --dir ./my-output
```

Start with telemetry disabled:

```bash
mastra start -nt
```

---
title: Mastra Client Agents API
description: Learn how to interact with Mastra AI agents, including generating responses, streaming interactions, and managing agent tools using the client-js SDK.
---

# Agents API
[EN] Source: https://mastra.ai/en/reference/client-js/agents

The Agents API provides methods to interact with Mastra AI agents, including generating responses, streaming interactions, and managing agent tools.

## Initialize Mastra Client

```typescript
import { MastraClient } from "@mastra/client-js";

const client = new MastraClient();
```

## Getting All Agents

Retrieve a list of all available agents:

```typescript
const agents = await client.getAgents();
```

## Working with a Specific Agent

Get an instance of a specific agent:

```typescript
const agent = client.getAgent("agent-id");
```

## Agent Methods

### Get Agent Details

Retrieve detailed information about an agent:

```typescript
const details = await agent.details();
```

### Generate Response

Generate a response from the agent:

```typescript
const response = await agent.generate({
  messages: [
    {
      role: "user",
      content: "Hello, how are you?",
    },
  ],
  threadId: "thread-1", // Optional: Thread ID for conversation context
  resourceid: "resource-1", // Optional: Resource ID
  output: {}, // Optional: Output configuration
});
```

### Stream Response

Stream responses from the agent for real-time interactions:

```typescript
const response = await agent.stream({
  messages: [
    {
      role: "user",
      content: "Tell me a story",
    },
  ],
});

// Process data stream with the processDataStream util
response.processDataStream({
  onTextPart: (text) => {
    process.stdout.write(text);
  },
  onFilePart: (file) => {
    console.log(file);
  },
  onDataPart: (data) => {
    console.log(data);
  },
  onErrorPart: (error) => {
    console.error(error);
  },
});

// Process text stream with the processTextStream util 
// (used with structured output)
 response.processTextStream({
      onTextPart: text => {
        process.stdout.write(text);
      },
});

// You can also read from response body directly
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(new TextDecoder().decode(value));
}
```

### Client tools

Client-side tools allow you to execute custom functions on the client side when the agent requests them.

#### Basic Usage

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const colorChangeTool = createTool({
  id: 'changeColor',
  description: 'Changes the background color',
  inputSchema: z.object({
    color: z.string(),
  }),
  execute: async ({ context }) => {
    document.body.style.backgroundColor = context.color;
    return { success: true };
  }
})


// Use with generate
const response = await agent.generate({
  messages: 'Change the background to blue',
  clientTools: {colorChangeTool},
});

// Use with stream
const response = await agent.stream({
  messages: 'Change the background to green',
  clientTools: {colorChangeTool},
});

response.processDataStream({
  onTextPart: (text) => console.log(text),
  onToolCallPart: (toolCall) => console.log('Tool called:', toolCall.toolName),
});
```

### Get Agent Tool

Retrieve information about a specific tool available to the agent:

```typescript
const tool = await agent.getTool("tool-id");
```

### Get Agent Evaluations

Get evaluation results for the agent:

```typescript
// Get CI evaluations
const evals = await agent.evals();

// Get live evaluations
const liveEvals = await agent.liveEvals();
```


---
title: Mastra Client Error Handling
description: Learn about the built-in retry mechanism and error handling capabilities in the Mastra client-js SDK.
---

# Error Handling
[EN] Source: https://mastra.ai/en/reference/client-js/error-handling

The Mastra Client SDK includes built-in retry mechanism and error handling capabilities.

## Error Handling

All API methods can throw errors that you can catch and handle:

```typescript
try {
  const agent = client.getAgent("agent-id");
  const response = await agent.generate({
    messages: [{ role: "user", content: "Hello" }],
  });
} catch (error) {
  console.error("An error occurred:", error.message);
}
```

## Retry Mechanism

The client automatically retries failed requests with exponential backoff:

```typescript
const client = new MastraClient({
  baseUrl: "http://localhost:5000",
  retries: 3, // Number of retry attempts
  backoffMs: 300, // Initial backoff time
  maxBackoffMs: 5000, // Maximum backoff time
});
```

### How Retries Work

1. First attempt fails → Wait 300ms
2. Second attempt fails → Wait 600ms
3. Third attempt fails → Wait 1200ms
4. Final attempt fails → Throw error


---
title: Mastra Client Logs API
description: Learn how to access and query system logs and debugging information in Mastra using the client-js SDK.
---

# Logs API
[EN] Source: https://mastra.ai/en/reference/client-js/logs

The Logs API provides methods to access and query system logs and debugging information in Mastra.

## Initialize Mastra Client

```typescript
import { MastraClient } from "@mastra/client-js";

const client = new MastraClient();
```

## Getting Logs

Retrieve system logs with optional filtering:

```typescript
const logs = await client.getLogs({
  transportId: "transport-1",
});
```

## Getting Logs for a Specific Run

Retrieve logs for a specific execution run:

```typescript
const runLogs = await client.getLogForRun({
  runId: "run-1",
  transportId: "transport-1",
});
```


---
title: Mastra Client Telemetry API
description: Learn how to retrieve and analyze traces from your Mastra application for monitoring and debugging using the client-js SDK.
---

# Telemetry API
[EN] Source: https://mastra.ai/en/reference/client-js/telemetry

The Telemetry API provides methods to retrieve and analyze traces from your Mastra application. This helps you monitor and debug your application's behavior and performance.

## Initialize Mastra Client

```typescript
import { MastraClient } from "@mastra/client-js";

const client = new MastraClient();
```

## Getting Traces

Retrieve traces with optional filtering and pagination:

```typescript
const telemetry = await client.getTelemetry({
  name: "trace-name", // Optional: Filter by trace name
  scope: "scope-name", // Optional: Filter by scope
  page: 1, // Optional: Page number for pagination
  perPage: 10, // Optional: Number of items per page
  attribute: {
    // Optional: Filter by custom attributes
    key: "value",
  },
});
```


---
title: Mastra Client Tools API
description: Learn how to interact with and execute tools available in the Mastra platform using the client-js SDK.
---

# Tools API
[EN] Source: https://mastra.ai/en/reference/client-js/tools

The Tools API provides methods to interact with and execute tools available in the Mastra platform.

## Initialize Mastra Client

```typescript
import { MastraClient } from "@mastra/client-js";

const client = new MastraClient();
```

## Getting All Tools

Retrieve a list of all available tools:

```typescript
const tools = await client.getTools();
```

## Working with a Specific Tool

Get an instance of a specific tool:

```typescript
const tool = client.getTool("tool-id");
```

## Tool Methods

### Get Tool Details

Retrieve detailed information about a tool:

```typescript
const details = await tool.details();
```

### Execute Tool

Execute a tool with specific arguments:

```typescript
const result = await tool.execute({
  args: {
    param1: "value1",
    param2: "value2",
  },
  threadId: "thread-1", // Optional: Thread context
  resourceid: "resource-1", // Optional: Resource identifier
});
```


---
title: Mastra Client Vectors API
description: Learn how to work with vector embeddings for semantic search and similarity matching in Mastra using the client-js SDK.
---

# Vectors API
[EN] Source: https://mastra.ai/en/reference/client-js/vectors

The Vectors API provides methods to work with vector embeddings for semantic search and similarity matching in Mastra.

## Initialize Mastra Client

```typescript
import { MastraClient } from "@mastra/client-js";

const client = new MastraClient();
```

## Working with Vectors

Get an instance of a vector store:

```typescript
const vector = client.getVector("vector-name");
```

## Vector Methods

### Get Vector Index Details

Retrieve information about a specific vector index:

```typescript
const details = await vector.details("index-name");
```

### Create Vector Index

Create a new vector index:

```typescript
const result = await vector.createIndex({
  indexName: "new-index",
  dimension: 128,
  metric: "cosine", // 'cosine', 'euclidean', or 'dotproduct'
});
```

### Upsert Vectors

Add or update vectors in an index:

```typescript
const ids = await vector.upsert({
  indexName: "my-index",
  vectors: [
    [0.1, 0.2, 0.3], // First vector
    [0.4, 0.5, 0.6], // Second vector
  ],
  metadata: [{ label: "first" }, { label: "second" }],
  ids: ["id1", "id2"], // Optional: Custom IDs
});
```

### Query Vectors

Search for similar vectors:

```typescript
const results = await vector.query({
  indexName: "my-index",
  queryVector: [0.1, 0.2, 0.3],
  topK: 10,
  filter: { label: "first" }, // Optional: Metadata filter
  includeVector: true, // Optional: Include vectors in results
});
```

### Get All Indexes

List all available indexes:

```typescript
const indexes = await vector.getIndexes();
```

### Delete Index

Delete a vector index:

```typescript
const result = await vector.delete("index-name");
```


---
title: Mastra Client Workflows (Legacy) API
description: Learn how to interact with and execute automated legacy workflows in Mastra using the client-js SDK.
---

# Workflows (Legacy) API
[EN] Source: https://mastra.ai/en/reference/client-js/workflows-legacy

The Workflows (Legacy) API provides methods to interact with and execute automated legacy workflows in Mastra.

## Initialize Mastra Client

```typescript
import { MastraClient } from "@mastra/client-js";

const client = new MastraClient();
```

## Getting All Legacy Workflows

Retrieve a list of all available legacy workflows:

```typescript
const workflows = await client.getLegacyWorkflows();
```

## Working with a Specific Legacy Workflow

Get an instance of a specific legacy workflow:

```typescript
const workflow = client.getLegacyWorkflow("workflow-id");
```

## Legacy Workflow Methods

### Get Legacy Workflow Details

Retrieve detailed information about a legacy workflow:

```typescript
const details = await workflow.details();
```

### Start Legacy Workflow run asynchronously

Start a legacy workflow run with triggerData and await full run results:

```typescript
const { runId } = workflow.createRun();

const result = await workflow.startAsync({
  runId,
  triggerData: {
    param1: "value1",
    param2: "value2",
  },
});
```

### Resume Legacy Workflow run asynchronously

Resume a suspended legacy workflow step and await full run result:

```typescript
const { runId } = createRun({ runId: prevRunId });

const result = await workflow.resumeAsync({
  runId,
  stepId: "step-id",
  contextData: { key: "value" },
});
```

### Watch Legacy Workflow

Watch legacy workflow transitions

```typescript
try {
  // Get workflow instance
  const workflow = client.getLegacyWorkflow("workflow-id");

  // Create a workflow run
  const { runId } = workflow.createRun();

  // Watch workflow run
  workflow.watch({ runId }, (record) => {
    // Every new record is the latest transition state of the workflow run

    console.log({
      activePaths: record.activePaths,
      results: record.results,
      timestamp: record.timestamp,
      runId: record.runId,
    });
  });

  // Start workflow run
  workflow.start({
    runId,
    triggerData: {
      city: "New York",
    },
  });
} catch (e) {
  console.error(e);
}
```

### Resume Legacy Workflow

Resume legacy workflow run and watch legacy workflow step transitions

```typescript
try {
  //To resume a workflow run, when a step is suspended
  const { run } = createRun({ runId: prevRunId });

  //Watch run
  workflow.watch({ runId }, (record) => {
    // Every new record is the latest transition state of the workflow run

    console.log({
      activePaths: record.activePaths,
      results: record.results,
      timestamp: record.timestamp,
      runId: record.runId,
    });
  });

  //resume run
  workflow.resume({
    runId,
    stepId: "step-id",
    contextData: { key: "value" },
  });
} catch (e) {
  console.error(e);
}
```

### Legacy Workflow run result

A legacy workflow run result yields the following:

| Field         | Type                                                                           | Description                                                        |
| ------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `activePaths` | `Record<string, { status: string; suspendPayload?: any; stepPath: string[] }>` | Currently active paths in the workflow with their execution status |
| `results`     | `LegacyWorkflowRunResult<any, any, any>['results']`                            | Results from the workflow execution                                |
| `timestamp`   | `number`                                                                       | Unix timestamp of when this transition occurred                    |
| `runId`       | `string`                                                                       | Unique identifier for this workflow run instance                   |


---
title: Mastra Client Workflows API
description: Learn how to interact with and execute automated workflows in Mastra using the client-js SDK.
---

# Workflows API
[EN] Source: https://mastra.ai/en/reference/client-js/workflows

The Workflows API provides methods to interact with and execute automated workflows in Mastra.

## Initialize Mastra Client

```typescript
import { MastraClient } from "@mastra/client-js";

const client = new MastraClient();
```

## Getting All Workflows

Retrieve a list of all available workflows:

```typescript
const workflows = await client.getWorkflows();
```

## Working with a Specific Workflow

Get an instance of a specific workflow as defined by the const name:

```typescript filename="src/mastra/workflows/test-workflow.ts"
export const testWorkflow = createWorkflow({
  id: 'city-workflow'
})
```

```typescript
const workflow = client.getWorkflow("testWorkflow");
```

## Workflow Methods

### Get Workflow Details

Retrieve detailed information about a workflow:

```typescript
const details = await workflow.details();
```

### Start workflow run asynchronously

Start a workflow run with inputData and await full run results:

```typescript
const run = await workflow.createRun();

const result = await workflow.startAsync({
  runId: run.runId,
  inputData: {
    city: "New York",
  },
});
```

### Resume Workflow run asynchronously

Resume a suspended workflow step and await full run result:

```typescript
const run = await workflow.createRun();

const result = await workflow.resumeAsync({
  runId: run.runId,
  step: "step-id",
  resumeData: { key: "value" },
});
```

### Watch Workflow

Watch workflow transitions:

```typescript
try {
  const workflow = client.getWorkflow("testWorkflow");

  const run = await workflow.createRun();

  workflow.watch({ runId: run.runId }, (record) => {
    console.log(record);
  });

  const result = await workflow.start({
    runId: run.runId,
    inputData: {
      city: "New York",
    },
  });
} catch (e) {
  console.error(e);
}
```

### Resume Workflow

Resume workflow run and watch workflow step transitions:

```typescript
try {
  const workflow = client.getWorkflow("testWorkflow");

  const run = await workflow.createRun({ runId: prevRunId });

  workflow.watch({ runId: run.runId }, (record) => {
    console.log(record);
  });

  workflow.resume({
    runId: run.runId,
    step: "step-id",
    resumeData: { key: "value" },
  });
} catch (e) {
  console.error(e);
}
```

### Get Workflow Run result

Get the result of a workflow run:

```typescript
try  {
  const workflow = client.getWorkflow("testWorkflow");

  const run = await workflow.createRun();

  // start the workflow run
  const startResult = await workflow.start({
    runId: run.runId,
    inputData: {
      city: "New York",
    },
  });

  const result = await workflow.runExecutionResult(run.runId);

  console.log(result);
} catch (e) {
  console.error(e);
}
```

This is useful when dealing with long running workflows. You can use this to poll the result of the workflow run.

### Workflow run result

A workflow run result yields the following:

| Field            | Type                                                                                                                                                                                                                                               | Description                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `payload`        | `{currentStep?: {id: string, status: string, output?: Record<string, any>, payload?: Record<string, any>}, workflowState: {status: string, steps: Record<string, {status: string, output?: Record<string, any>, payload?: Record<string, any>}>}}` | The current step and workflow state of the run   |
| `eventTimestamp` | `Date`                                                                                                                                                                                                                                             | The timestamp of the event                       |
| `runId`          | `string`                                                                                                                                                                                                                                           | Unique identifier for this workflow run instance |


---
title: "Mastra Core"
description: Documentation for the Mastra Class, the core entry point for managing agents, workflows, MCP servers, and server endpoints.
---

# The Mastra Class
[EN] Source: https://mastra.ai/en/reference/core/mastra-class

The `Mastra` class is the central orchestrator in any Mastra application, managing agents, workflows, storage, logging, telemetry, and more. Typically, you create a single instance of `Mastra` to coordinate your application.

Think of `Mastra` as a top-level registry:

- Registering **integrations** makes them accessible to **agents**, **workflows**, and **tools** alike.
- **tools** aren’t registered on `Mastra` directly but are associated with agents and discovered automatically.


## Importing

```typescript
import { Mastra } from "@mastra/core";
```

## Constructor

Creates a new `Mastra` instance with the specified configuration.

```typescript
constructor(config?: Config);
```

## Initialization

The Mastra class is typically initialized in your `src/mastra/index.ts` file:

```typescript filename="src/mastra/index.ts" showLineNumbers copy
import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { weatherAgent } from "./agents/weather-agent";

export const mastra = new Mastra({
  agents: { weatherAgent },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
});
```

## Configuration Object

The constructor accepts an optional `Config` object to customize its behavior and integrate various Mastra components. All properties on the `Config` object are optional.

### Properties

<PropertiesTable
  content={[
    {
      name: "agents",
      type: "Agent[]",
      description: "Array of Agent instances to register",
      isOptional: true,
      defaultValue: "[]",
    },
    {
      name: "tools",
      type: "Record<string, ToolApi>",
      description:
        "Custom tools to register. Structured as a key-value pair, with keys being the tool name and values being the tool function.",
      isOptional: true,
      defaultValue: "{}",
    },
    {
      name: "storage",
      type: "MastraStorage",
      description: "Storage engine instance for persisting data",
      isOptional: true,
    },
    {
      name: "vectors",
      type: "Record<string, MastraVector>",
      description:
        "Vector store instance, used for semantic search and vector-based tools (eg Pinecone, PgVector or Qdrant)",
      isOptional: true,
    },
    {
      name: "logger",
      type: "Logger",
      description: "Logger instance created with new PinoLogger()",
      isOptional: true,
      defaultValue: "Console logger with INFO level",
    },
    {
      name: "workflows",
      type: "Record<string, Workflow>",
      description:
        "Workflows to register. Structured as a key-value pair, with keys being the workflow name and values being the workflow instance.",
      isOptional: true,
      defaultValue: "{}",
    },
    {
      name: "tts",
      type: "Record<string, MastraTTS>",
      isOptional: true,
      description: "An object for registering Text-To-Speech services.",
    },
    {
      name: "telemetry",
      type: "OtelConfig",
      isOptional: true,
      description: "Configuration for OpenTelemetry integration.",
    },
    {
      name: "deployer",
      type: "MastraDeployer",
      isOptional: true,
      description: "An instance of a MastraDeployer for managing deployments.",
    },
    {
      name: "server",
      type: "ServerConfig",
      description:
        "Server configuration including port, host, timeout, API routes, middleware, CORS settings, and build options for Swagger UI, API request logging, and OpenAPI docs.",
      isOptional: true,
      defaultValue:
        "{ port: 5000, host: localhost,  cors: { origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization', 'x-mastra-client-type'], exposeHeaders: ['Content-Length', 'X-Requested-With'], credentials: false } }",
    },
    {
      name: "mcpServers",
      type: "Record<string, MCPServerBase>",
      isOptional: true,
      description:
        "An object where keys are unique server identifiers and values are instances of MCPServer or classes extending MCPServerBase. This allows Mastra to be aware of and potentially manage these MCP servers.",
    },
    {
      name: "bundler",
      type: "BundlerConfig",
      description: "Configuration for the asset bundler.",
    },
  ]}
/>

## Usage

Any of the below methods can be used with the Mastra class, for example:

```typescript {3} filename="example.ts" showLineNumbers
import { mastra } from "./mastra";

const agent = mastra.getAgent("weatherAgent");
const result = await agent.generate("What's the weather like in London?");
```

### Methods

<PropertiesTable
  content={[
    {
      name: "getAgent(name)",
      type: "Agent",
      description:
        "Returns an agent instance by id. Throws if agent not found.",
      example: 'const agent = mastra.getAgent("agentOne");',
    },
    {
      name: "getAgents()",
      type: "Record<string, Agent>",
      description: "Returns all registered agents as a key-value object.",
      example: "const agents = mastra.getAgents();",
    },
    {
      name: "getWorkflow(id, { serialized })",
      type: "Workflow",
      description:
        "Returns a workflow instance by id. The serialized option (default: false) returns a simplified representation with just the name.",
      example: 'const workflow = mastra.getWorkflow("myWorkflow");',
    },
    {
      name: "getWorkflows({ serialized })",
      type: "Record<string, Workflow>",
      description:
        "Returns all registered workflows. The serialized option (default: false) returns simplified representations.",
      example: "const workflows = mastra.getWorkflows();",
    },
    {
      name: "getVector(name)",
      type: "MastraVector",
      description:
        "Returns a vector store instance by name. Throws if not found.",
      example: 'const vectorStore = mastra.getVector("myVectorStore");',
    },
    {
      name: "getVectors()",
      type: "Record<string, MastraVector>",
      description:
        "Returns all registered vector stores as a key-value object.",
      example: "const vectorStores = mastra.getVectors();",
    },
    {
      name: "getDeployer()",
      type: "MastraDeployer | undefined",
      description: "Returns the configured deployer instance, if any.",
      example: "const deployer = mastra.getDeployer();",
    },
    {
      name: "getStorage()",
      type: "MastraStorage | undefined",
      description: "Returns the configured storage instance.",
      example: "const storage = mastra.getStorage();",
    },
    {
      name: "getMemory()",
      type: "MastraMemory | undefined",
      description:
        "Returns the configured memory instance. Note: This is deprecated, memory should be added to agents directly.",
      example: "const memory = mastra.getMemory();",
    },
    {
      name: "getServer()",
      type: "ServerConfig | undefined",
      description:
        "Returns the server configuration including port, timeout, API routes, middleware, CORS settings, and build options.",
      example: "const serverConfig = mastra.getServer();",
    },
    {
      name: "setStorage(storage)",
      type: "void",
      description: "Sets the storage instance for the Mastra instance.",
      example: "mastra.setStorage(new DefaultStorage());",
    },
    {
      name: "setLogger({ logger })",
      type: "void",
      description:
        "Sets the logger for all components (agents, workflows, etc.).",
      example:
        'mastra.setLogger({ logger: new PinoLogger({ name: "MyLogger" }) });',
    },
    {
      name: "setTelemetry(telemetry)",
      type: "void",
      description: "Sets the telemetry configuration for all components.",
      example: 'mastra.setTelemetry({ export: { type: "console" } });',
    },
    {
      name: "getLogger()",
      type: "Logger",
      description: "Gets the configured logger instance.",
      example: "const logger = mastra.getLogger();",
    },
    {
      name: "getTelemetry()",
      type: "Telemetry | undefined",
      description: "Gets the configured telemetry instance.",
      example: "const telemetry = mastra.getTelemetry();",
    },
    {
      name: "getLogsByRunId({ runId, transportId })",
      type: "Promise<any>",
      description: "Retrieves logs for a specific run ID and transport ID.",
      example:
        'const logs = await mastra.getLogsByRunId({ runId: "123", transportId: "456" });',
    },
    {
      name: "getLogs(transportId)",
      type: "Promise<any>",
      description: "Retrieves all logs for a specific transport ID.",
      example: 'const logs = await mastra.getLogs("transportId");',
    },
    {
      name: "getMCPServers()",
      type: "Record<string, MCPServerBase> | undefined",
      description: "Retrieves all registered MCP server instances.",
      example: "const mcpServers = mastra.getMCPServers();",
    },
  ]}
/>

## Error Handling

The Mastra class methods throw typed errors that can be caught:

```typescript {8} filename="example.ts" showLineNumbers
import { mastra } from "./mastra";

try {
  const agent = mastra.getAgent("weatherAgent");
  const result = await agent.generate("What's the weather like in London?");

} catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```


---
title: "Cloudflare Deployer"
description: "Documentation for the CloudflareDeployer class, which deploys Mastra applications to Cloudflare Workers."
---

# Logger Instance
[EN] Source: https://mastra.ai/en/reference/observability/logger

A Logger instance is created by `new PinoLogger()` and provides methods to record events at various severity levels. Depending on the logger type, messages may be written to the console, file, or an external service.

## Example

```typescript showLineNumbers copy
// Using a console logger
const logger = new PinoLogger({ name: "Mastra", level: "info" });

logger.debug("Debug message"); // Won't be logged because level is INFO
logger.info({
  message: "User action occurred",
  destinationPath: "user-actions",
  type: "AGENT",
}); // Logged
logger.error("An error occurred"); // Logged as ERROR
```

## Methods

<PropertiesTable
  content={[
    {
      name: "debug",
      type: "(message: BaseLogMessage | string, ...args: any[]) => void | Promise<void>",
      description: "Write a DEBUG-level log. Only recorded if level ≤ DEBUG.",
    },
    {
      name: "info",
      type: "(message: BaseLogMessage | string, ...args: any[]) => void | Promise<void>",
      description: "Write an INFO-level log. Only recorded if level ≤ INFO.",
    },
    {
      name: "warn",
      type: "(message: BaseLogMessage | string, ...args: any[]) => void | Promise<void>",
      description: "Write a WARN-level log. Only recorded if level ≤ WARN.",
    },
    {
      name: "error",
      type: "(message: BaseLogMessage | string, ...args: any[]) => void | Promise<void>",
      description: "Write an ERROR-level log. Only recorded if level ≤ ERROR.",
    },
    {
      name: "cleanup",
      type: "() => Promise<void>",
      isOptional: true,
      description:
        "Cleanup resources held by the logger (e.g., network connections for Upstash). Not all loggers implement this.",
    },
  ]}
/>

**Note:** Some loggers require a `BaseLogMessage` object (with `message`, `destinationPath`, `type` fields). For instance, the `File` and `Upstash` loggers need structured messages.

## File Transport (Structured Logs)

```typescript showLineNumbers copy
import { FileTransport } from "@mastra/loggers/file";

const fileLogger = new PinoLogger({
  name: "Mastra",
  transports: { file: new FileTransport({ path: "test-dir/test.log" }) },
  level: "warn",
});

fileLogger.warn("Low disk space", {
  destinationPath: "system",
  type: "WORKFLOW",
});
```

## Upstash Logger (Remote Log Drain)

```typescript showLineNumbers copy
import { UpstashTransport } from "@mastra/loggers/upstash";

const logger = new PinoLogger({
  name: "Mastra",
  transports: {
    upstash: new UpstashTransport({
      listName: "production-logs",
      upstashUrl: process.env.UPSTASH_URL!,
      upstashToken: process.env.UPSTASH_TOKEN!,
    }),
  },
  level: "info",
});

logger.info({
  message: "User signed in",
  destinationPath: "auth",
  type: "AGENT",
  runId: "run_123",
});
```

## Custom Transport

You can create custom transports using the `createCustomTransport` utility to integrate with any logging service or stream.

### Example: Sentry Integration

```typescript showLineNumbers copy
import { createCustomTransport } from "@mastra/core/loggers";
import pinoSentry from 'pino-sentry-transport';

const sentryStream = await pinoSentry({
  sentry: {
    dsn: 'YOUR_SENTRY_DSN',
    _experiments: {
      enableLogs: true,
    },
  },
});

const customTransport = createCustomTransport(sentryStream);

const logger = new PinoLogger({
  name: "Mastra",
  transports: { sentry: customTransport },
  level: "info",
});
```

---
title: "Reference: OtelConfig | Mastra Observability Docs"
description: Documentation for the OtelConfig object, which configures OpenTelemetry instrumentation, tracing, and exporting behavior.
---

# DatabaseConfig
[EN] Source: https://mastra.ai/en/reference/rag/database-config

The `DatabaseConfig` type allows you to specify database-specific configurations when using vector query tools. These configurations enable you to leverage unique features and optimizations offered by different vector stores.

## Type Definition

```typescript
export type DatabaseConfig = {
  pinecone?: PineconeConfig;
  pgvector?: PgVectorConfig;
  chroma?: ChromaConfig;
  [key: string]: any; // Extensible for future databases
};
```

## Database-Specific Types

### PineconeConfig

Configuration options specific to Pinecone vector store.

<PropertiesTable
  content={[
    {
      name: "namespace",
      type: "string",
      description: "Pinecone namespace for organizing and isolating vectors within the same index. Useful for multi-tenancy or environment separation.",
      isOptional: true,
    },
    {
      name: "sparseVector",
      type: "{ indices: number[]; values: number[]; }",
      description: "Sparse vector for hybrid search combining dense and sparse embeddings. Enables better search quality for keyword-based queries.  The indices and values arrays must be the same length.",
      isOptional: true,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "indices",
              description: "Array of indices for sparse vector components",
              isOptional: false,
              type: "number[]",
            },
            {
              name: "values",
              description: "Array of values corresponding to the indices",
              isOptional: false,
              type: "number[]",
            },
          ],
        },
      ],
    },
  ]}
/>

**Use Cases:**
- Multi-tenant applications (separate namespaces per tenant)
- Environment isolation (dev/staging/prod namespaces)
- Hybrid search combining semantic and keyword matching

### PgVectorConfig

Configuration options specific to PostgreSQL with pgvector extension.

<PropertiesTable
  content={[
    {
      name: "minScore",
      type: "number",
      description: "Minimum similarity score threshold for results. Only vectors with similarity scores above this value will be returned.",
      isOptional: true,
    },
    {
      name: "ef",
      type: "number",
      description: "HNSW search parameter that controls the size of the dynamic candidate list during search. Higher values improve accuracy at the cost of speed. Typically set between topK and 200.",
      isOptional: true,
    },
    {
      name: "probes",
      type: "number",
      description: "IVFFlat probe parameter that specifies the number of index cells to visit during search. Higher values improve recall at the cost of speed.",
      isOptional: true,
    },
  ]}
/>

**Performance Guidelines:**
- **ef**: Start with 2-4x your topK value, increase for better accuracy
- **probes**: Start with 1-10, increase for better recall
- **minScore**: Use values between 0.5-0.9 depending on your quality requirements

**Use Cases:**
- Performance optimization for high-load scenarios
- Quality filtering to remove irrelevant results
- Fine-tuning search accuracy vs speed tradeoffs

### ChromaConfig

Configuration options specific to Chroma vector store.

<PropertiesTable
  content={[
    {
      name: "where",
      type: "Record<string, any>",
      description: "Metadata filtering conditions using MongoDB-style query syntax. Filters results based on metadata fields.",
      isOptional: true,
    },
    {
      name: "whereDocument",
      type: "Record<string, any>",
      description: "Document content filtering conditions. Allows filtering based on the actual document text content.",
      isOptional: true,
    },
  ]}
/>

**Filter Syntax Examples:**
```typescript
// Simple equality
where: { "category": "technical" }

// Operators
where: { "price": { "$gt": 100 } }

// Multiple conditions
where: { 
  "category": "electronics",
  "inStock": true 
}

// Document content filtering
whereDocument: { "$contains": "API documentation" }
```

**Use Cases:**
- Advanced metadata filtering
- Content-based document filtering
- Complex query combinations

## Usage Examples

<Tabs items={['Basic Usage', 'Runtime Override', 'Multi-Database', 'Performance Tuning']}>
  <Tabs.Tab>
    ### Basic Database Configuration

    ```typescript
    import { createVectorQueryTool } from '@mastra/rag';
    
    const vectorTool = createVectorQueryTool({
      vectorStoreName: 'pinecone',
      indexName: 'documents',
      model: embedModel,
      databaseConfig: {
        pinecone: {
          namespace: 'production'
        }
      }
    });
    ```
  </Tabs.Tab>

  <Tabs.Tab>
    ### Runtime Configuration Override

    ```typescript
    import { RuntimeContext } from '@mastra/core/runtime-context';
    
    // Initial configuration
    const vectorTool = createVectorQueryTool({
      vectorStoreName: 'pinecone',
      indexName: 'documents', 
      model: embedModel,
      databaseConfig: {
        pinecone: {
          namespace: 'development'
        }
      }
    });
    
    // Override at runtime
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('databaseConfig', {
      pinecone: {
        namespace: 'production'
      }
    });
    
    await vectorTool.execute({
      context: { queryText: 'search query' },
      mastra,
      runtimeContext
    });
    ```
  </Tabs.Tab>

  <Tabs.Tab>
    ### Multi-Database Configuration

    ```typescript
    const vectorTool = createVectorQueryTool({
      vectorStoreName: 'dynamic', // Will be determined at runtime
      indexName: 'documents',
      model: embedModel,
      databaseConfig: {
        pinecone: {
          namespace: 'default'
        },
        pgvector: {
          minScore: 0.8,
          ef: 150
        },
        chroma: {
          where: { 'type': 'documentation' }
        }
      }
    });
    ```

    <Callout>
      **Multi-Database Support**: When you configure multiple databases, only the configuration matching the actual vector store being used will be applied.
    </Callout>
  </Tabs.Tab>

  <Tabs.Tab>
    ### Performance Tuning

    ```typescript
    // High accuracy configuration
    const highAccuracyTool = createVectorQueryTool({
      vectorStoreName: 'postgres',
      indexName: 'embeddings',
      model: embedModel,
      databaseConfig: {
        pgvector: {
          ef: 400,        // High accuracy
          probes: 20,     // High recall
          minScore: 0.85  // High quality threshold
        }
      }
    });
    
    // High speed configuration  
    const highSpeedTool = createVectorQueryTool({
      vectorStoreName: 'postgres',
      indexName: 'embeddings',
      model: embedModel,
      databaseConfig: {
        pgvector: {
          ef: 50,         // Lower accuracy, faster
          probes: 3,      // Lower recall, faster
          minScore: 0.6   // Lower quality threshold
        }
      }
    });
    ```
  </Tabs.Tab>
</Tabs>

## Extensibility

The `DatabaseConfig` type is designed to be extensible. To add support for a new vector database:

```typescript
// 1. Define the configuration interface
export interface NewDatabaseConfig {
  customParam1?: string;
  customParam2?: number;
}

// 2. Extend DatabaseConfig type
export type DatabaseConfig = {
  pinecone?: PineconeConfig;
  pgvector?: PgVectorConfig;
  chroma?: ChromaConfig;
  newdatabase?: NewDatabaseConfig;
  [key: string]: any;
};

// 3. Use in vector query tool
const vectorTool = createVectorQueryTool({
  vectorStoreName: 'newdatabase',
  indexName: 'documents',
  model: embedModel,
  databaseConfig: {
    newdatabase: {
      customParam1: 'value',
      customParam2: 42
    }
  }
});
```

## Best Practices

1. **Environment Configuration**: Use different namespaces or configurations for different environments
2. **Performance Tuning**: Start with default values and adjust based on your specific needs
3. **Quality Filtering**: Use minScore to filter out low-quality results
4. **Runtime Flexibility**: Override configurations at runtime for dynamic scenarios
5. **Documentation**: Document your specific configuration choices for team members

## Migration Guide

Existing vector query tools continue to work without changes. To add database configurations:

```diff
const vectorTool = createVectorQueryTool({
  vectorStoreName: 'pinecone',
  indexName: 'documents',
  model: embedModel,
+ databaseConfig: {
+   pinecone: {
+     namespace: 'production'
+   }
+ }
});
```

## Related

- [createVectorQueryTool()](/reference/tools/vector-query-tool)
- [Hybrid Vector Search](/examples/rag/query/hybrid-vector-search.mdx)
- [Metadata Filters](/reference/rag/metadata-filters) 

---
title: "Reference: MDocument | Document Processing | RAG | Mastra Docs"
description: Documentation for the MDocument class in Mastra, which handles document processing and chunking.
---

# MDocument
[EN] Source: https://mastra.ai/en/reference/rag/document

The MDocument class processes documents for RAG applications. The main methods are `.chunk()` and `.extractMetadata()`.

## Constructor

<PropertiesTable
  content={[
    {
      name: "docs",
      type: "Array<{ text: string, metadata?: Record<string, any> }>",
      description:
        "Array of document chunks with their text content and optional metadata",
    },
    {
      name: "type",
      type: "'text' | 'html' | 'markdown' | 'json' | 'latex'",
      description: "Type of document content",
    },
  ]}
/>

## Static Methods

### fromText()

Creates a document from plain text content.

```typescript
static fromText(text: string, metadata?: Record<string, any>): MDocument
```

### fromHTML()

Creates a document from HTML content.

```typescript
static fromHTML(html: string, metadata?: Record<string, any>): MDocument
```

### fromMarkdown()

Creates a document from Markdown content.

```typescript
static fromMarkdown(markdown: string, metadata?: Record<string, any>): MDocument
```

### fromJSON()

Creates a document from JSON content.

```typescript
static fromJSON(json: string, metadata?: Record<string, any>): MDocument
```

## Instance Methods

### chunk()

Splits document into chunks and optionally extracts metadata.

```typescript
async chunk(params?: ChunkParams): Promise<Chunk[]>
```

See [chunk() reference](./chunk) for detailed options.

### getDocs()

Returns array of processed document chunks.

```typescript
getDocs(): Chunk[]
```

### getText()

Returns array of text strings from chunks.

```typescript
getText(): string[]
```

### getMetadata()

Returns array of metadata objects from chunks.

```typescript
getMetadata(): Record<string, any>[]
```

### extractMetadata()

Extracts metadata using specified extractors. See [ExtractParams reference](./extract-params) for details.

```typescript
async extractMetadata(params: ExtractParams): Promise<MDocument>
```

## Examples

```typescript
import { MDocument } from "@mastra/rag";

// Create document from text
const doc = MDocument.fromText("Your content here");

// Split into chunks with metadata extraction
const chunks = await doc.chunk({
  strategy: "markdown",
  headers: [
    ["#", "title"],
    ["##", "section"],
  ],
  extract: {
    summary: true, // Extract summaries with default settings
    keywords: true, // Extract keywords with default settings
  },
});

// Get processed chunks
const docs = doc.getDocs();
const texts = doc.getText();
const metadata = doc.getMetadata();
```


---
title: "Reference: embed() | Document Embedding | RAG | Mastra Docs"
description: Documentation for embedding functionality in Mastra using the AI SDK.
---

# Embed
[EN] Source: https://mastra.ai/en/reference/rag/embeddings

Mastra uses the AI SDK's `embed` and `embedMany` functions to generate vector embeddings for text inputs, enabling similarity search and RAG workflows.

## Single Embedding

The `embed` function generates a vector embedding for a single text input:

```typescript
import { embed } from "ai";

const result = await embed({
  model: openai.embedding("text-embedding-3-small"),
  value: "Your text to embed",
  maxRetries: 2, // optional, defaults to 2
});
```

### Parameters

<PropertiesTable
  content={[
    {
      name: "model",
      type: "EmbeddingModel",
      description:
        "The embedding model to use (e.g. openai.embedding('text-embedding-3-small'))",
    },
    {
      name: "value",
      type: "string | Record<string, any>",
      description: "The text content or object to embed",
    },
    {
      name: "maxRetries",
      type: "number",
      description:
        "Maximum number of retries per embedding call. Set to 0 to disable retries.",
      isOptional: true,
      defaultValue: "2",
    },
    {
      name: "abortSignal",
      type: "AbortSignal",
      description: "Optional abort signal to cancel the request",
      isOptional: true,
    },
    {
      name: "headers",
      type: "Record<string, string>",
      description:
        "Additional HTTP headers for the request (only for HTTP-based providers)",
      isOptional: true,
    },
  ]}
/>

### Return Value

<PropertiesTable
  content={[
    {
      name: "embedding",
      type: "number[]",
      description: "The embedding vector for the input",
    },
  ]}
/>

## Multiple Embeddings

For embedding multiple texts at once, use the `embedMany` function:

```typescript
import { embedMany } from "ai";

const result = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: ["First text", "Second text", "Third text"],
  maxRetries: 2, // optional, defaults to 2
});
```

### Parameters

<PropertiesTable
  content={[
    {
      name: "model",
      type: "EmbeddingModel",
      description:
        "The embedding model to use (e.g. openai.embedding('text-embedding-3-small'))",
    },
    {
      name: "values",
      type: "string[] | Record<string, any>[]",
      description: "Array of text content or objects to embed",
    },
    {
      name: "maxRetries",
      type: "number",
      description:
        "Maximum number of retries per embedding call. Set to 0 to disable retries.",
      isOptional: true,
      defaultValue: "2",
    },
    {
      name: "abortSignal",
      type: "AbortSignal",
      description: "Optional abort signal to cancel the request",
      isOptional: true,
    },
    {
      name: "headers",
      type: "Record<string, string>",
      description:
        "Additional HTTP headers for the request (only for HTTP-based providers)",
      isOptional: true,
    },
  ]}
/>

### Return Value

<PropertiesTable
  content={[
    {
      name: "embeddings",
      type: "number[][]",
      description:
        "Array of embedding vectors corresponding to the input values",
    },
  ]}
/>

## Example Usage

```typescript
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

// Single embedding
const singleResult = await embed({
  model: openai.embedding("text-embedding-3-small"),
  value: "What is the meaning of life?",
});

// Multiple embeddings
const multipleResult = await embedMany({
  model: openai.embedding("text-embedding-3-small"),
  values: [
    "First question about life",
    "Second question about universe",
    "Third question about everything",
  ],
});
```

For more detailed information about embeddings in the Vercel AI SDK, see:

- [AI SDK Embeddings Overview](https://sdk.vercel.ai/docs/ai-sdk-core/embeddings)
- [embed()](https://sdk.vercel.ai/docs/reference/ai-sdk-core/embed)
- [embedMany()](https://sdk.vercel.ai/docs/reference/ai-sdk-core/embed-many)


---
title: "Reference: ExtractParams | Document Processing | RAG | Mastra Docs"
description: Documentation for metadata extraction configuration in Mastra.
---

# ExtractParams
[EN] Source: https://mastra.ai/en/reference/rag/extract-params

ExtractParams configures metadata extraction from document chunks using LLM analysis.

## Example

```typescript showLineNumbers copy
import { MDocument } from "@mastra/rag";

const doc = MDocument.fromText(text);
const chunks = await doc.chunk({
  extract: {
    title: true, // Extract titles using default settings
    summary: true, // Generate summaries using default settings
    keywords: true, // Extract keywords using default settings
  },
});

// Example output:
// chunks[0].metadata = {
//   documentTitle: "AI Systems Overview",
//   sectionSummary: "Overview of artificial intelligence concepts and applications",
//   excerptKeywords: "KEYWORDS: AI, machine learning, algorithms"
// }
```

## Parameters

The `extract` parameter accepts the following fields:

<PropertiesTable
  content={[
    {
      name: "title",
      type: "boolean | TitleExtractorsArgs",
      isOptional: true,
      description:
        "Enable title extraction. Set to true for default settings, or provide custom configuration.",
    },
    {
      name: "summary",
      type: "boolean | SummaryExtractArgs",
      isOptional: true,
      description:
        "Enable summary extraction. Set to true for default settings, or provide custom configuration.",
    },
    {
      name: "questions",
      type: "boolean | QuestionAnswerExtractArgs",
      isOptional: true,
      description:
        "Enable question generation. Set to true for default settings, or provide custom configuration.",
    },
    {
      name: "keywords",
      type: "boolean | KeywordExtractArgs",
      isOptional: true,
      description:
        "Enable keyword extraction. Set to true for default settings, or provide custom configuration.",
    },
  ]}
/>

## Extractor Arguments

### TitleExtractorsArgs

<PropertiesTable
  content={[
    {
      name: "llm",
      type: "MastraLanguageModel",
      isOptional: true,
      description: "AI SDK language model to use for title extraction",
    },
    {
      name: "nodes",
      type: "number",
      isOptional: true,
      description: "Number of title nodes to extract",
    },
    {
      name: "nodeTemplate",
      type: "string",
      isOptional: true,
      description:
        "Custom prompt template for title node extraction. Must include {context} placeholder",
    },
    {
      name: "combineTemplate",
      type: "string",
      isOptional: true,
      description:
        "Custom prompt template for combining titles. Must include {context} placeholder",
    },
  ]}
/>

### SummaryExtractArgs

<PropertiesTable
  content={[
    {
      name: "llm",
      type: "MastraLanguageModel",
      isOptional: true,
      description: "AI SDK language model to use for summary extraction",
    },
    {
      name: "summaries",
      type: "('self' | 'prev' | 'next')[]",
      isOptional: true,
      description:
        "List of summary types to generate. Can only include 'self' (current chunk), 'prev' (previous chunk), or 'next' (next chunk)",
    },
    {
      name: "promptTemplate",
      type: "string",
      isOptional: true,
      description:
        "Custom prompt template for summary generation. Must include {context} placeholder",
    },
  ]}
/>

### QuestionAnswerExtractArgs

<PropertiesTable
  content={[
    {
      name: "llm",
      type: "MastraLanguageModel",
      isOptional: true,
      description: "AI SDK language model to use for question generation",
    },
    {
      name: "questions",
      type: "number",
      isOptional: true,
      description: "Number of questions to generate",
    },
    {
      name: "promptTemplate",
      type: "string",
      isOptional: true,
      description:
        "Custom prompt template for question generation. Must include both {context} and {numQuestions} placeholders",
    },
    {
      name: "embeddingOnly",
      type: "boolean",
      isOptional: true,
      description: "If true, only generate embeddings without actual questions",
    },
  ]}
/>

### KeywordExtractArgs

<PropertiesTable
  content={[
    {
      name: "llm",
      type: "MastraLanguageModel",
      isOptional: true,
      description: "AI SDK language model to use for keyword extraction",
    },
    {
      name: "keywords",
      type: "number",
      isOptional: true,
      description: "Number of keywords to extract",
    },
    {
      name: "promptTemplate",
      type: "string",
      isOptional: true,
      description:
        "Custom prompt template for keyword extraction. Must include both {context} and {maxKeywords} placeholders",
    },
  ]}
/>

## Advanced Example

```typescript showLineNumbers copy
import { MDocument } from "@mastra/rag";

const doc = MDocument.fromText(text);
const chunks = await doc.chunk({
  extract: {
    // Title extraction with custom settings
    title: {
      nodes: 2, // Extract 2 title nodes
      nodeTemplate: "Generate a title for this: {context}",
      combineTemplate: "Combine these titles: {context}",
    },

    // Summary extraction with custom settings
    summary: {
      summaries: ["self"], // Generate summaries for current chunk
      promptTemplate: "Summarize this: {context}",
    },

    // Question generation with custom settings
    questions: {
      questions: 3, // Generate 3 questions
      promptTemplate: "Generate {numQuestions} questions about: {context}",
      embeddingOnly: false,
    },

    // Keyword extraction with custom settings
    keywords: {
      keywords: 5, // Extract 5 keywords
      promptTemplate: "Extract {maxKeywords} key terms from: {context}",
    },
  },
});

// Example output:
// chunks[0].metadata = {
//   documentTitle: "AI in Modern Computing",
//   sectionSummary: "Overview of AI concepts and their applications in computing",
//   questionsThisExcerptCanAnswer: "1. What is machine learning?\n2. How do neural networks work?",
//   excerptKeywords: "1. Machine learning\n2. Neural networks\n3. Training data"
// }
```

## Document Grouping for Title Extraction

When using the `TitleExtractor`, you can group multiple chunks together for title extraction by specifying a shared `docId` in the `metadata` field of each chunk. All chunks with the same `docId` will receive the same extracted title. If no `docId` is set, each chunk is treated as its own document for title extraction.

**Example:**

```ts
import { MDocument } from "@mastra/rag";

const doc = new MDocument({
  docs: [
    { text: "chunk 1", metadata: { docId: "docA" } },
    { text: "chunk 2", metadata: { docId: "docA" } },
    { text: "chunk 3", metadata: { docId: "docB" } },
  ],
  type: "text",
});

await doc.extractMetadata({ title: true });
// The first two chunks will share a title, while the third chunk will be assigned a separate title.
```


---
title: "Reference: GraphRAG | Graph-based RAG | RAG | Mastra Docs"
description: Documentation for the GraphRAG class in Mastra, which implements a graph-based approach to retrieval augmented generation.
---

[EN] Source: https://mastra.ai/en/reference/rag/rerankWithScorer

The `rerankWithScorer()` function provides advanced reranking capabilities for vector search results by combining semantic relevance, vector similarity, and position-based scoring.

```typescript
function rerankWithScorer({
  results: QueryResult[],
  query: string,
  scorer: RelevanceScoreProvider,
  options?: RerankerFunctionOptions,
}): Promise<RerankResult[]>;
```

## Usage Example

```typescript
import { openai } from "@ai-sdk/openai";
import { rerankWithScorer as rerank, CohereRelevanceScorer } from "@mastra/rag";

const scorer = new CohereRelevanceScorer('rerank-v3.5');

const rerankedResults = await rerank({
  results: vectorSearchResults,
  query: "How do I deploy to production?",
  scorer,
  options: {
    weights: {
      semantic: 0.5,
      vector: 0.3,
      position: 0.2,
    },
    topK: 3,
  },
});
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "results",
      type: "QueryResult[]",
      description: "The vector search results to rerank",
      isOptional: false,
    },
    {
      name: "query",
      type: "string",
      description: "The search query text used to evaluate relevance",
      isOptional: false,
    },
    {
      name: "scorer",
      type: "RelevanceScoreProvider",
      description: "The relevance scorer to use for reranking",
      isOptional: false,
    },
    {
      name: "options",
      type: "RerankerFunctionOptions",
      description: "Options for the reranking model",
      isOptional: true,
    },
  ]}
/>

The `rerankWithScorer` function accepts any `RelevanceScoreProvider` from @mastra/rag.

> **Note:** For semantic scoring to work properly during re-ranking, each result must include the text content in its `metadata.text` field.

### RerankerFunctionOptions

<PropertiesTable
  content={[
    {
      name: "weights",
      type: "WeightConfig",
      description:
        "Weights for different scoring components (must add up to 1)",
      isOptional: true,
      properties: [
        {
          type: "number",
          parameters: [
            {
              name: "semantic",
              description: "Weight for semantic relevance",
              isOptional: true,
              type: "number (default: 0.4)",
            },
          ],
        },
        {
          type: "number",
          parameters: [
            {
              name: "vector",
              description: "Weight for vector similarity",
              isOptional: true,
              type: "number (default: 0.4)",
            },
          ],
        },
        {
          type: "number",
          parameters: [
            {
              name: "position",
              description: "Weight for position-based scoring",
              isOptional: true,
              type: "number (default: 0.2)",
            },
          ],
        },
      ],
    },
    {
      name: "queryEmbedding",
      type: "number[]",
      description: "Embedding of the query",
      isOptional: true,
    },
    {
      name: "topK",
      type: "number",
      description: "Number of top results to return",
      isOptional: true,
      defaultValue: "3",
    },
  ]}
/>

## Returns

The function returns an array of `RerankResult` objects:

<PropertiesTable
  content={[
    {
      name: "result",
      type: "QueryResult",
      description: "The original query result",
    },
    {
      name: "score",
      type: "number",
      description: "Combined reranking score (0-1)",
    },
    {
      name: "details",
      type: "ScoringDetails",
      description: "Detailed scoring information",
    },
  ]}
/>

### ScoringDetails

<PropertiesTable
  content={[
    {
      name: "semantic",
      type: "number",
      description: "Semantic relevance score (0-1)",
    },
    {
      name: "vector",
      type: "number",
      description: "Vector similarity score (0-1)",
    },
    {
      name: "position",
      type: "number",
      description: "Position-based score (0-1)",
    },
    {
      name: "queryAnalysis",
      type: "object",
      description: "Query analysis details",
      isOptional: true,
      properties: [
        {
          type: "number",
          parameters: [
            {
              name: "magnitude",
              description: "Magnitude of the query",
            },
          ],
        },
        {
          type: "number[]",
          parameters: [
            {
              name: "dominantFeatures",
              description: "Dominant features of the query",
            },
          ],
        },
      ],
    },
  ]}
/>

## Related

- [createVectorQueryTool](../tools/vector-query-tool)


---
title: "Reference: Turbopuffer Vector Store | Vector Databases | RAG | Mastra Docs"
description: Documentation for integrating Turbopuffer with Mastra, a high-performance vector database for efficient similarity search.
---


# PostgreSQL Storage
[EN] Source: https://mastra.ai/en/reference/storage/postgresql

The PostgreSQL storage implementation provides a production-ready storage solution using PostgreSQL databases.

## Installation

```bash copy
npm install @mastra/pg@latest
```

## Usage

```typescript copy showLineNumbers
import { PostgresStore } from "@mastra/pg";

const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL,
});
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "connectionString",
      type: "string",
      description:
        "PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/dbname)",
      isOptional: false,
    },
    {
      name: "schemaName",
      type: "string",
      description:
        "The name of the schema you want the storage to use. Will use the default schema if not provided.",
      isOptional: true,
    },
  ]}
/>

## Constructor Examples

You can instantiate `PostgresStore` in the following ways:

```ts
import { PostgresStore } from "@mastra/pg";

// Using a connection string only
const store1 = new PostgresStore({
  connectionString: "postgresql://user:password@localhost:5432/mydb",
});

// Using a connection string with a custom schema name
const store2 = new PostgresStore({
  connectionString: "postgresql://user:password@localhost:5432/mydb",
  schemaName: "custom_schema", // optional
});

// Using individual connection parameters
const store4 = new PostgresStore({
  host: "localhost",
  port: 5432,
  database: "mydb",
  user: "user",
  password: "password",
});

// Individual parameters with schemaName
const store5 = new PostgresStore({
  host: "localhost",
  port: 5432,
  database: "mydb",
  user: "user",
  password: "password",
  schemaName: "custom_schema", // optional
});
```

## Additional Notes

### Schema Management

The storage implementation handles schema creation and updates automatically. It creates the following tables:

- `threads`: Stores conversation threads
- `messages`: Stores individual messages
- `metadata`: Stores additional metadata for threads and messages

### Direct Database and Pool Access

`PostgresStore` exposes both the underlying database object and the pg-promise instance as public fields:

```typescript
store.db  // pg-promise database instance
store.pgp // pg-promise main instance
```

This enables direct queries and custom transaction management. When using these fields:
- You are responsible for proper connection and transaction handling.
- Closing the store (`store.close()`) will destroy the associated connection pool.
- Direct access bypasses any additional logic or validation provided by PostgresStore methods.

This approach is intended for advanced scenarios where low-level access is required.



---
title: "Upstash Storage | Storage System | Mastra Core"
description: Documentation for the Upstash storage implementation in Mastra.
---

# createTool()
[EN] Source: https://mastra.ai/en/reference/tools/create-tool

The `createTool()` function is used to define custom tools that your Mastra agents can execute. Tools extend an agent's capabilities by allowing it to interact with external systems, perform calculations, or access specific data.

## Basic Usage

Here is a basic example of creating a tool that fetches weather information:

```typescript filename="src/mastra/tools/weatherInfo.ts" copy
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const weatherInfo = createTool({
  id: "Get Weather Information",
  inputSchema: z.object({
    city: z.string(),
  }),
  description: `Fetches the current weather information for a given city`,
  execute: async ({ context: { city } }) => {
    // Tool logic here (e.g., API call)
    console.log("Using tool to fetch weather information for", city);
    return { temperature: 20, conditions: "Sunny" }; // Example return
  },
});
```

## Parameters

The `createTool()` function accepts an object with the following parameters:

<PropertiesTable
  content={[
    {
      name: "id",
      type: "string",
      description: "A unique identifier for the tool.",
      isOptional: false,
    },
    {
      name: "description",
      type: "string",
      description:
        "A description of what the tool does. This is used by the agent to decide when to use the tool.",
      isOptional: false,
    },
    {
      name: "inputSchema",
      type: "Zod schema",
      description:
        "A Zod schema defining the expected input parameters for the tool's `execute` function.",
      isOptional: true,
    },
    {
      name: "outputSchema",
      type: "Zod schema",
      description:
        "A Zod schema defining the expected output structure of the tool's `execute` function.",
      isOptional: true,
    },
    {
      name: "execute",
      type: "function",
      description:
        "The function that contains the tool's logic. It receives an object with `context` (the parsed input based on `inputSchema`), `runtimeContext`, and an object containing `abortSignal`.",
      isOptional: false,
    },
  ]}
/>

## Returns

The `createTool()` function returns a `Tool` object.

<PropertiesTable
  content={[
    {
      name: "Tool",
      type: "object",
      description:
        "An object representing the defined tool, ready to be added to an agent.",
    },
  ]}
/>

## Tool Details

The `Tool` object returned by `createTool()` has the following key properties:

- **ID**: The unique identifier provided in the `id` parameter.
- **Description**: The description provided in the `description` parameter.
- **Parameters**: Derived from the `inputSchema`, defining the structure of inputs the tool expects.
- **Execute Function**: The logic defined in the `execute` parameter, which is called when the agent decides to use the tool.

## Related

- [Tools Overview](/docs/tools-mcp/overview)
- [Using Tools with Agents](/docs/agents/using-tools-and-mcp)
- [Dynamic Tool Context](/docs/tools-mcp/dynamic-context)
- [Advanced Tool Usage](/docs/tools-mcp/advanced-usage)


---
title: "Reference: createDocumentChunkerTool() | Tools | Mastra Docs"
description: Documentation for the Document Chunker Tool in Mastra, which splits documents into smaller chunks for efficient processing and retrieval.
---

# createDocumentChunkerTool()
[EN] Source: https://mastra.ai/en/reference/tools/document-chunker-tool

The `createDocumentChunkerTool()` function creates a tool for splitting documents into smaller chunks for efficient processing and retrieval. It supports different chunking strategies and configurable parameters.

## Basic Usage

```typescript
import { createDocumentChunkerTool, MDocument } from "@mastra/rag";

const document = new MDocument({
  text: "Your document content here...",
  metadata: { source: "user-manual" },
});

const chunker = createDocumentChunkerTool({
  doc: document,
  params: {
    strategy: "recursive",
    size: 512,
    overlap: 50,
    separator: "\n",
  },
});

const { chunks } = await chunker.execute();
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "doc",
      type: "MDocument",
      description: "The document to be chunked",
      isOptional: false,
    },
    {
      name: "params",
      type: "ChunkParams",
      description: "Configuration parameters for chunking",
      isOptional: true,
      defaultValue: "Default chunking parameters",
    },
  ]}
/>

### ChunkParams

<PropertiesTable
  content={[
    {
      name: "strategy",
      type: "'recursive'",
      description: "The chunking strategy to use",
      isOptional: true,
      defaultValue: "'recursive'",
    },
    {
      name: "size",
      type: "number",
      description: "Target size of each chunk in tokens/characters",
      isOptional: true,
      defaultValue: "512",
    },
    {
      name: "overlap",
      type: "number",
      description: "Number of overlapping tokens/characters between chunks",
      isOptional: true,
      defaultValue: "50",
    },
    {
      name: "separator",
      type: "string",
      description: "Character(s) to use as chunk separator",
      isOptional: true,
      defaultValue: "'\\n'",
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "chunks",
      type: "DocumentChunk[]",
      description: "Array of document chunks with their content and metadata",
    },
  ]}
/>

## Example with Custom Parameters

```typescript
const technicalDoc = new MDocument({
  text: longDocumentContent,
  metadata: {
    type: "technical",
    version: "1.0",
  },
});

const chunker = createDocumentChunkerTool({
  doc: technicalDoc,
  params: {
    strategy: "recursive",
    size: 1024, // Larger chunks
    overlap: 100, // More overlap
    separator: "\n\n", // Split on double newlines
  },
});

const { chunks } = await chunker.execute();

// Process the chunks
chunks.forEach((chunk, index) => {
  console.log(`Chunk ${index + 1} length: ${chunk.content.length}`);
});
```

## Tool Details

The chunker is created as a Mastra tool with the following properties:

- **Tool ID**: `Document Chunker {strategy} {size}`
- **Description**: `Chunks document using {strategy} strategy with size {size} and {overlap} overlap`
- **Input Schema**: Empty object (no additional inputs required)
- **Output Schema**: Object containing the chunks array

## Related

- [MDocument](../rag/document.mdx)
- [createVectorQueryTool](./vector-query-tool)


---
title: "Reference: createGraphRAGTool() | RAG | Mastra Tools Docs"
description: Documentation for the Graph RAG Tool in Mastra, which enhances RAG by building a graph of semantic relationships between documents.
---

import { Callout } from "nextra/components";

# createGraphRAGTool()
[EN] Source: https://mastra.ai/en/reference/tools/graph-rag-tool

The `createGraphRAGTool()` creates a tool that enhances RAG by building a graph of semantic relationships between documents. It uses the `GraphRAG` system under the hood to provide graph-based retrieval, finding relevant content through both direct similarity and connected relationships.

## Usage Example

```typescript
import { openai } from "@ai-sdk/openai";
import { createGraphRAGTool } from "@mastra/rag";

const graphTool = createGraphRAGTool({
  vectorStoreName: "pinecone",
  indexName: "docs",
  model: openai.embedding("text-embedding-3-small"),
  graphOptions: {
    dimension: 1536,
    threshold: 0.7,
    randomWalkSteps: 100,
    restartProb: 0.15,
  },
});
```

## Parameters

<Callout>
  **Parameter Requirements:** Most fields can be set at creation as defaults.
  Some fields can be overridden at runtime via the runtime context or input. If
  a required field is missing from both creation and runtime, an error will be
  thrown. Note that `model`, `id`, and `description` can only be set at creation
  time.
</Callout>

<PropertiesTable
  content={[
    {
      name: "id",
      type: "string",
      description:
        "Custom ID for the tool. By default: 'GraphRAG {vectorStoreName} {indexName} Tool'. (Set at creation only.)",
      isOptional: true,
    },
    {
      name: "description",
      type: "string",
      description:
        "Custom description for the tool. By default: 'Access and analyze relationships between information in the knowledge base to answer complex questions about connections and patterns.' (Set at creation only.)",
      isOptional: true,
    },
    {
      name: "vectorStoreName",
      type: "string",
      description:
        "Name of the vector store to query. (Can be set at creation or overridden at runtime.)",
      isOptional: false,
    },
    {
      name: "indexName",
      type: "string",
      description:
        "Name of the index within the vector store. (Can be set at creation or overridden at runtime.)",
      isOptional: false,
    },
    {
      name: "model",
      type: "EmbeddingModel",
      description:
        "Embedding model to use for vector search. (Set at creation only.)",
      isOptional: false,
    },
    {
      name: "enableFilter",
      type: "boolean",
      description:
        "Enable filtering of results based on metadata. (Set at creation only, but will be automatically enabled if a filter is provided in the runtime context.)",
      isOptional: true,
      defaultValue: "false",
    },
    {
      name: "includeSources",
      type: "boolean",
      description:
        "Include the full retrieval objects in the results. (Can be set at creation or overridden at runtime.)",
      isOptional: true,
      defaultValue: "true",
    },
    {
      name: "graphOptions",
      type: "GraphOptions",
      description: "Configuration for the graph-based retrieval",
      isOptional: true,
      defaultValue: "Default graph options",
    },
  ]}
/>

### GraphOptions

<PropertiesTable
  content={[
    {
      name: "dimension",
      type: "number",
      description: "Dimension of the embedding vectors",
      isOptional: true,
      defaultValue: "1536",
    },
    {
      name: "threshold",
      type: "number",
      description:
        "Similarity threshold for creating edges between nodes (0-1)",
      isOptional: true,
      defaultValue: "0.7",
    },
    {
      name: "randomWalkSteps",
      type: "number",
      description:
        "Number of steps in random walk for graph traversal. (Can be set at creation or overridden at runtime.)",
      isOptional: true,
      defaultValue: "100",
    },
    {
      name: "restartProb",
      type: "number",
      description:
        "Probability of restarting random walk from query node. (Can be set at creation or overridden at runtime.)",
      isOptional: true,
      defaultValue: "0.15",
    },
  ]}
/>

## Returns

The tool returns an object with:

<PropertiesTable
  content={[
    {
      name: "relevantContext",
      type: "string",
      description:
        "Combined text from the most relevant document chunks, retrieved using graph-based ranking",
    },
    {
      name: "sources",
      type: "QueryResult[]",
      description:
        "Array of full retrieval result objects. Each object contains all information needed to reference the original document, chunk, and similarity score.",
    },
  ]}
/>

### QueryResult object structure

```typescript
{
  id: string;         // Unique chunk/document identifier
  metadata: any;      // All metadata fields (document ID, etc.)
  vector: number[];   // Embedding vector (if available)
  score: number;      // Similarity score for this retrieval
  document: string;   // Full chunk/document text (if available)
}
```

## Default Tool Description

The default description focuses on:

- Analyzing relationships between documents
- Finding patterns and connections
- Answering complex queries

## Advanced Example

```typescript
const graphTool = createGraphRAGTool({
  vectorStoreName: "pinecone",
  indexName: "docs",
  model: openai.embedding("text-embedding-3-small"),
  graphOptions: {
    dimension: 1536,
    threshold: 0.8, // Higher similarity threshold
    randomWalkSteps: 200, // More exploration steps
    restartProb: 0.2, // Higher restart probability
  },
});
```

## Example with Custom Description

```typescript
const graphTool = createGraphRAGTool({
  vectorStoreName: "pinecone",
  indexName: "docs",
  model: openai.embedding("text-embedding-3-small"),
  description:
    "Analyze document relationships to find complex patterns and connections in our company's historical data",
});
```

This example shows how to customize the tool description for a specific use case while maintaining its core purpose of relationship analysis.

## Example: Using Runtime Context

```typescript
const graphTool = createGraphRAGTool({
  vectorStoreName: "pinecone",
  indexName: "docs",
  model: openai.embedding("text-embedding-3-small"),
});
```

When using runtime context, provide required parameters at execution time via the runtime context:

```typescript
const runtimeContext = new RuntimeContext<{
  vectorStoreName: string;
  indexName: string;
  topK: number;
  filter: any;
}>();
runtimeContext.set("vectorStoreName", "my-store");
runtimeContext.set("indexName", "my-index");
runtimeContext.set("topK", 5);
runtimeContext.set("filter", { category: "docs" });
runtimeContext.set("randomWalkSteps", 100);
runtimeContext.set("restartProb", 0.15);

const response = await agent.generate(
  "Find documentation from the knowledge base.",
  {
    runtimeContext,
  },
);
```

For more information on runtime context, please see:

- [Runtime Variables](../../docs/agents/runtime-variables)
- [Dynamic Context](../../docs/tools-mcp/dynamic-context)

## Related

- [createVectorQueryTool](./vector-query-tool)
- [GraphRAG](../rag/graph-rag)


---
title: "Reference: MCPClient | Tool Management | Mastra Docs"
description: API Reference for MCPClient - A class for managing multiple Model Context Protocol servers and their tools.
---

# createVectorQueryTool()
[EN] Source: https://mastra.ai/en/reference/tools/vector-query-tool

The `createVectorQueryTool()` function creates a tool for semantic search over vector stores. It supports filtering, reranking, database-specific configurations, and integrates with various vector store backends.

## Basic Usage

```typescript
import { openai } from "@ai-sdk/openai";
import { createVectorQueryTool } from "@mastra/rag";

const queryTool = createVectorQueryTool({
  vectorStoreName: "pinecone",
  indexName: "docs",
  model: openai.embedding("text-embedding-3-small"),
});
```

## Parameters

<Callout>
  **Parameter Requirements:** Most fields can be set at creation as defaults.
  Some fields can be overridden at runtime via the runtime context or input. If
  a required field is missing from both creation and runtime, an error will be
  thrown. Note that `model`, `id`, and `description` can only be set at creation
  time.
</Callout>

<PropertiesTable
  content={[
    {
      name: "id",
      type: "string",
      description:
        "Custom ID for the tool. By default: 'VectorQuery {vectorStoreName} {indexName} Tool'. (Set at creation only.)",
      isOptional: true,
    },
    {
      name: "description",
      type: "string",
      description:
        "Custom description for the tool. By default: 'Access the knowledge base to find information needed to answer user questions' (Set at creation only.)",
      isOptional: true,
    },
    {
      name: "model",
      type: "EmbeddingModel",
      description:
        "Embedding model to use for vector search. (Set at creation only.)",
      isOptional: false,
    },
    {
      name: "vectorStoreName",
      type: "string",
      description:
        "Name of the vector store to query. (Can be set at creation or overridden at runtime.)",
      isOptional: false,
    },
    {
      name: "indexName",
      type: "string",
      description:
        "Name of the index within the vector store. (Can be set at creation or overridden at runtime.)",
      isOptional: false,
    },
    {
      name: "enableFilter",
      type: "boolean",
      description:
        "Enable filtering of results based on metadata. (Set at creation only, but will be automatically enabled if a filter is provided in the runtime context.)",
      isOptional: true,
      defaultValue: "false",
    },
    {
      name: "includeVectors",
      type: "boolean",
      description:
        "Include the embedding vectors in the results. (Can be set at creation or overridden at runtime.)",
      isOptional: true,
      defaultValue: "false",
    },
    {
      name: "includeSources",
      type: "boolean",
      description:
        "Include the full retrieval objects in the results. (Can be set at creation or overridden at runtime.)",
      isOptional: true,
      defaultValue: "true",
    },
    {
      name: "reranker",
      type: "RerankConfig",
      description:
        "Options for reranking results. (Can be set at creation or overridden at runtime.)",
      isOptional: true,
    },
    {
      name: "databaseConfig",
      type: "DatabaseConfig",
      description:
        "Database-specific configuration options for optimizing queries. (Can be set at creation or overridden at runtime.)",
      isOptional: true,
    },
  ]}
/>

### DatabaseConfig

The `DatabaseConfig` type allows you to specify database-specific configurations that are automatically applied to query operations. This enables you to take advantage of unique features and optimizations offered by different vector stores.

<PropertiesTable
  content={[
    {
      name: "pinecone",
      type: "PineconeConfig",
      description: "Configuration specific to Pinecone vector store",
      isOptional: true,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "namespace",
              description: "Pinecone namespace for organizing vectors",
              isOptional: true,
              type: "string",
            },
            {
              name: "sparseVector",
              description: "Sparse vector for hybrid search",
              isOptional: true,
              type: "{ indices: number[]; values: number[]; }",
            },
          ],
        },
      ],
    },
    {
      name: "pgvector",
      type: "PgVectorConfig",
      description: "Configuration specific to PostgreSQL with pgvector extension",
      isOptional: true,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "minScore",
              description: "Minimum similarity score threshold for results",
              isOptional: true,
              type: "number",
            },
            {
              name: "ef",
              description: "HNSW search parameter - controls accuracy vs speed tradeoff",
              isOptional: true,
              type: "number",
            },
            {
              name: "probes",
              description: "IVFFlat probe parameter - number of cells to visit during search",
              isOptional: true,
              type: "number",
            },
          ],
        },
      ],
    },
    {
      name: "chroma",
      type: "ChromaConfig",
      description: "Configuration specific to Chroma vector store",
      isOptional: true,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "where",
              description: "Metadata filtering conditions",
              isOptional: true,
              type: "Record<string, any>",
            },
            {
              name: "whereDocument",
              description: "Document content filtering conditions",
              isOptional: true,
              type: "Record<string, any>",
            },
          ],
        },
      ],
    },
  ]}
/>

### RerankConfig

<PropertiesTable
  content={[
    {
      name: "model",
      type: "MastraLanguageModel",
      description: "Language model to use for reranking",
      isOptional: false,
    },
    {
      name: "options",
      type: "RerankerOptions",
      description: "Options for the reranking process",
      isOptional: true,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "weights",
              description:
                "Weights for scoring components (semantic: 0.4, vector: 0.4, position: 0.2)",
              isOptional: true,
              type: "WeightConfig",
            },
            {
              name: "topK",
              description: "Number of top results to return",
              isOptional: true,
              type: "number",
              defaultValue: "3",
            },
          ],
        },
      ],
    },
  ]}
/>

## Returns

The tool returns an object with:

<PropertiesTable
  content={[
    {
      name: "relevantContext",
      type: "string",
      description: "Combined text from the most relevant document chunks",
    },
    {
      name: "sources",
      type: "QueryResult[]",
      description:
        "Array of full retrieval result objects. Each object contains all information needed to reference the original document, chunk, and similarity score.",
    },
  ]}
/>

### QueryResult object structure

```typescript
{
  id: string;         // Unique chunk/document identifier
  metadata: any;      // All metadata fields (document ID, etc.)
  vector: number[];   // Embedding vector (if available)
  score: number;      // Similarity score for this retrieval
  document: string;   // Full chunk/document text (if available)
}
```

## Default Tool Description

The default description focuses on:

- Finding relevant information in stored knowledge
- Answering user questions
- Retrieving factual content

## Result Handling

The tool determines the number of results to return based on the user's query, with a default of 10 results. This can be adjusted based on the query requirements.

## Example with Filters

```typescript
const queryTool = createVectorQueryTool({
  vectorStoreName: "pinecone",
  indexName: "docs",
  model: openai.embedding("text-embedding-3-small"),
  enableFilter: true,
});
```

With filtering enabled, the tool processes queries to construct metadata filters that combine with semantic search. The process works as follows:

1. A user makes a query with specific filter requirements like "Find content where the 'version' field is greater than 2.0"
2. The agent analyzes the query and constructs the appropriate filters:
   ```typescript
   {
      "version": { "$gt": 2.0 }
   }
   ```

This agent-driven approach:

- Processes natural language queries into filter specifications
- Implements vector store-specific filter syntax
- Translates query terms to filter operators

For detailed filter syntax and store-specific capabilities, see the [Metadata Filters](../rag/metadata-filters) documentation.

For an example of how agent-driven filtering works, see the [Agent-Driven Metadata Filtering](../../../examples/rag/usage/filter-rag) example.

## Example with Reranking

```typescript
const queryTool = createVectorQueryTool({
  vectorStoreName: "milvus",
  indexName: "documentation",
  model: openai.embedding("text-embedding-3-small"),
  reranker: {
    model: openai("gpt-4o-mini"),
    options: {
      weights: {
        semantic: 0.5, // Semantic relevance weight
        vector: 0.3, // Vector similarity weight
        position: 0.2, // Original position weight
      },
      topK: 5,
    },
  },
});
```

Reranking improves result quality by combining:

- Semantic relevance: Using LLM-based scoring of text similarity
- Vector similarity: Original vector distance scores
- Position bias: Consideration of original result ordering
- Query analysis: Adjustments based on query characteristics

The reranker processes the initial vector search results and returns a reordered list optimized for relevance.

## Example with Custom Description

```typescript
const queryTool = createVectorQueryTool({
  vectorStoreName: "pinecone",
  indexName: "docs",
  model: openai.embedding("text-embedding-3-small"),
  description:
    "Search through document archives to find relevant information for answering questions about company policies and procedures",
});
```

This example shows how to customize the tool description for a specific use case while maintaining its core purpose of information retrieval.

## Database-Specific Configuration Examples

The `databaseConfig` parameter allows you to leverage unique features and optimizations specific to each vector database. These configurations are automatically applied during query execution.

<Tabs items={['Pinecone', 'pgVector', 'Chroma', 'Multiple Configs']}>
  <Tabs.Tab>
    ### Pinecone Configuration

    ```typescript
    const pineconeQueryTool = createVectorQueryTool({
      vectorStoreName: "pinecone",
      indexName: "docs",
      model: openai.embedding("text-embedding-3-small"),
      databaseConfig: {
        pinecone: {
          namespace: "production",  // Organize vectors by environment
          sparseVector: {          // Enable hybrid search
            indices: [0, 1, 2, 3],
            values: [0.1, 0.2, 0.15, 0.05]
          }
        }
      }
    });
    ```

    **Pinecone Features:**
    - **Namespace**: Isolate different data sets within the same index
    - **Sparse Vector**: Combine dense and sparse embeddings for improved search quality
    - **Use Cases**: Multi-tenant applications, hybrid semantic search
  </Tabs.Tab>

  <Tabs.Tab>
    ### pgVector Configuration

    ```typescript
    const pgVectorQueryTool = createVectorQueryTool({
      vectorStoreName: "postgres",
      indexName: "embeddings",
      model: openai.embedding("text-embedding-3-small"),
      databaseConfig: {
        pgvector: {
          minScore: 0.7,    // Only return results above 70% similarity
          ef: 200,          // Higher value = better accuracy, slower search
          probes: 10        // For IVFFlat: more probes = better recall
        }
      }
    });
    ```

    **pgVector Features:**
    - **minScore**: Filter out low-quality matches
    - **ef (HNSW)**: Control accuracy vs speed for HNSW indexes
    - **probes (IVFFlat)**: Control recall vs speed for IVFFlat indexes
    - **Use Cases**: Performance tuning, quality filtering
  </Tabs.Tab>

  <Tabs.Tab>
    ### Chroma Configuration

    ```typescript
    const chromaQueryTool = createVectorQueryTool({
      vectorStoreName: "chroma",
      indexName: "documents",
      model: openai.embedding("text-embedding-3-small"),
      databaseConfig: {
        chroma: {
          where: {                    // Metadata filtering
            "category": "technical",
            "status": "published"
          },
          whereDocument: {            // Document content filtering
            "$contains": "API"
          }
        }
      }
    });
    ```

    **Chroma Features:**
    - **where**: Filter by metadata fields
    - **whereDocument**: Filter by document content
    - **Use Cases**: Advanced filtering, content-based search
  </Tabs.Tab>

  <Tabs.Tab>
    ### Multiple Database Configurations

    ```typescript
    // Configure for multiple databases (useful for dynamic stores)
    const multiDbQueryTool = createVectorQueryTool({
      vectorStoreName: "dynamic-store", // Will be set at runtime
      indexName: "docs",
      model: openai.embedding("text-embedding-3-small"),
      databaseConfig: {
        pinecone: {
          namespace: "default"
        },
        pgvector: {
          minScore: 0.8,
          ef: 150
        },
        chroma: {
          where: { "type": "documentation" }
        }
      }
    });
    ```

    **Multi-Config Benefits:**
    - Support multiple vector stores with one tool
    - Database-specific optimizations are automatically applied
    - Flexible deployment scenarios
  </Tabs.Tab>
</Tabs>

### Runtime Configuration Override

You can override database configurations at runtime to adapt to different scenarios:

```typescript
import { RuntimeContext } from '@mastra/core/runtime-context';

const queryTool = createVectorQueryTool({
  vectorStoreName: "pinecone",
  indexName: "docs",
  model: openai.embedding("text-embedding-3-small"),
  databaseConfig: {
    pinecone: {
      namespace: "development"
    }
  }
});

// Override at runtime
const runtimeContext = new RuntimeContext();
runtimeContext.set('databaseConfig', {
  pinecone: {
    namespace: 'production'  // Switch to production namespace
  }
});

const response = await agent.generate(
  "Find information about deployment",
  { runtimeContext }
);
```

This approach allows you to:
- Switch between environments (dev/staging/prod)
- Adjust performance parameters based on load
- Apply different filtering strategies per request

## Example: Using Runtime Context

```typescript
const queryTool = createVectorQueryTool({
  vectorStoreName: "pinecone",
  indexName: "docs",
  model: openai.embedding("text-embedding-3-small"),
});
```

When using runtime context, provide required parameters at execution time via the runtime context:

```typescript
const runtimeContext = new RuntimeContext<{
  vectorStoreName: string;
  indexName: string;
  topK: number;
  filter: VectorFilter;
  databaseConfig: DatabaseConfig;
}>();
runtimeContext.set("vectorStoreName", "my-store");
runtimeContext.set("indexName", "my-index");
runtimeContext.set("topK", 5);
runtimeContext.set("filter", { category: "docs" });
runtimeContext.set("databaseConfig", {
  pinecone: { namespace: "runtime-namespace" }
});
runtimeContext.set("model", openai.embedding("text-embedding-3-small"));

const response = await agent.generate(
  "Find documentation from the knowledge base.",
  {
    runtimeContext,
  },
);
```

For more information on runtime context, please see:

- [Runtime Variables](../../docs/agents/runtime-variables)
- [Dynamic Context](../../docs/tools-mcp/dynamic-context)

## Tool Details

The tool is created with:

- **ID**: `VectorQuery {vectorStoreName} {indexName} Tool`
- **Input Schema**: Requires queryText and filter objects
- **Output Schema**: Returns relevantContext string

## Related

- [rerank()](../rag/rerank)
- [createGraphRAGTool](./graph-rag-tool)


---
title: "Reference: Workflow.branch() | Building Workflows | Mastra Docs"
description: Documentation for the `.branch()` method in workflows, which creates conditional branches between steps.
---

# Workflow.branch()
[EN] Source: https://mastra.ai/en/reference/workflows/branch

The `.branch()` method creates conditional branches between workflow steps, allowing for different paths to be taken based on the result of a previous step.

## Usage

```typescript
workflow.branch([
  [async ({ context }) => true, stepOne],
  [async ({ context }) => false, stepTwo],
]);
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "steps",
      type: "[() => boolean, Step]",
      description:
        "An array of tuples, each containing a condition function and a step to execute if the condition is true",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "NewWorkflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Conditional branching](../../docs/workflows/flow-control.mdx#conditional-branching)
- [Conditional branching example](../../examples/workflows/conditional-branching.mdx)


---
title: "Reference: Workflow.commit() | Building Workflows | Mastra Docs"
description: Documentation for the `.commit()` method in workflows, which finalizes the workflow and returns the final result.
---

# Workflow.commit()
[EN] Source: https://mastra.ai/en/reference/workflows/commit

The `.commit()` method finalizes the workflow and returns the final result.

## Usage

```typescript
workflow.then(stepOne).commit();
```

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Control flow](../../docs/workflows/control-flow.mdx)


---
title: "Reference: Workflow.createRunAsync() | Building Workflows | Mastra Docs"
description: Documentation for the `.createRunAsync()` method in workflows, which creates a new workflow run instance.
---

# Workflow.createRunAsync()
[EN] Source: https://mastra.ai/en/reference/workflows/create-run

The `.createRunAsync()` method creates a new workflow run instance, allowing you to execute the workflow with specific input data.

## Usage

```typescript
const myWorkflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({
    startValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  steps: [step1, step2, step3], // Declare steps used in this workflow
})
  .then(step1)
  .then(step2)
  .then(step3)
  .commit();

const mastra = new Mastra({
  workflows: {
    myWorkflow,
  },
});

const run = await mastra.getWorkflow("myWorkflow").createRunAsync();
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "options",
      type: "{ runId?: string }",
      description:
        "Optional configuration for the run, including a custom run ID",
      isOptional: true,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "run",
      type: "Run",
      description:
        "A new workflow run instance that can be used to execute the workflow",
    },
  ]}
/>

## Related

- [Running workflows](../../docs/workflows/overview.mdx#running-workflows)


---
title: "Reference: Workflow.dountil() | Building Workflows | Mastra Docs"
description: Documentation for the `.dountil()` method in workflows, which creates a loop that executes a step until a condition is met.
---

# Workflow.dountil()
[EN] Source: https://mastra.ai/en/reference/workflows/dountil

The `.dountil()` method creates a loop that executes a step until a condition is met.

## Usage

```typescript
workflow.dountil(stepOne, async ({ inputData }) => true);
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "step",
      type: "Step",
      description: "The step instance to execute in the loop",
      isOptional: false,
    },
    {
      name: "condition",
      type: "(params : { inputData: any}) => Promise<boolean>",
      description:
        "A function that returns a boolean indicating whether to continue the loop",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Loops](../../docs/workflows/control-flow.mdx#loops)
- [Loops example](../../examples/workflows/control-flow.mdx)


---
title: "Reference: Workflow.dowhile() | Building Workflows | Mastra Docs"
description: Documentation for the `.dowhile()` method in workflows, which creates a loop that executes a step while a condition is met.
---

# Workflow.dowhile()
[EN] Source: https://mastra.ai/en/reference/workflows/dowhile

The `.dowhile()` method creates a loop that executes a step while a condition is met.

## Usage

```typescript
workflow.dowhile(stepOne, async ({ inputData }) => true);
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "step",
      type: "Step",
      description: "The step instance to execute in the loop",
      isOptional: false,
    },
    {
      name: "condition",
      type: "(params : { inputData: any}) => Promise<boolean>",
      description:
        "A function that returns a boolean indicating whether to continue the loop",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Loops](../../docs/workflows/flow-control.mdx#loops)
- [Loops example](../../examples/workflows/control-flow.mdx)


---
title: "Reference: Workflow.execute() | Building Workflows | Mastra Docs"
description: Documentation for the `.execute()` method in workflows, which executes a step with input data and returns the output.
---

# Workflow.execute()
[EN] Source: https://mastra.ai/en/reference/workflows/execute

The `.execute()` method executes a step with input data and returns the output, allowing you to process data within a workflow.

## Usage

```typescript
const inputSchema = z.object({
  inputValue: z.string(),
});

const myStep = createStep({
  id: "my-step",
  description: "Does something useful",
  inputSchema,
  outputSchema: z.object({
    outputValue: z.string(),
  }),
  resumeSchema: z.object({
    resumeValue: z.string(),
  }),
  suspendSchema: z.object({
    suspendValue: z.string(),
  }),
  execute: async ({
    inputData,
    mastra,
    getStepResult,
    getInitData,
    runtimeContext,
  }) => {
    const otherStepOutput = getStepResult(step2);
    const initData = getInitData<typeof inputSchema>(); // typed as the input schema variable (zod schema)
    return {
      outputValue: `Processed: ${inputData.inputValue}, ${initData.startValue} (runtimeContextValue: ${runtimeContext.get("runtimeContextValue")})`,
    };
  },
});
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "params",
      type: "object",
      description: "Configuration object for executing the step",
      isOptional: false,
      properties: [
        {
          name: "inputData",
          type: "z.infer<TInput>",
          description: "Input data matching the step's input schema",
          isOptional: false,
        },
        {
          name: "resumeData",
          type: "ResumeSchema",
          description: "Data for resuming a suspended step",
          isOptional: true,
        },
        {
          name: "suspend",
          type: "(suspendPayload: any) => Promise<void>",
          description: "Function to suspend step execution",
          isOptional: false,
        },
        {
          name: "resume",
          type: "object",
          description: "Configuration for resuming execution",
          isOptional: true,
          properties: [
            {
              name: "steps",
              type: "string[]",
              description: "Steps to resume",
              isOptional: false,
            },
            {
              name: "resumePayload",
              type: "any",
              description: "Payload data for resuming",
              isOptional: false,
            },
            {
              name: "runId",
              type: "string",
              description: "ID of the run to resume",
              isOptional: true,
            },
          ],
        },
        {
          name: "emitter",
          type: "object",
          description: "Event emitter object",
          isOptional: false,
          properties: [
            {
              name: "emit",
              type: "(event: string, data: any) => void",
              description: "Function to emit events",
              isOptional: false,
            },
          ],
        },
        {
          name: "mastra",
          type: "Mastra",
          description: "Mastra instance",
          isOptional: false,
        },
      ],
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "result",
      type: "Promise<z.infer<TOutput>>",
      description: "A promise that resolves to the output of the executed step",
    },
  ]}
/>

## Related

- [Running workflows](../../docs/workflows/overview.mdx#running-workflows)


---
title: "Reference: Workflow.foreach() | Building Workflows | Mastra Docs"
description: Documentation for the `.foreach()` method in workflows, which creates a loop that executes a step for each item in an array.
---

# Workflow.foreach()
[EN] Source: https://mastra.ai/en/reference/workflows/foreach

The `.foreach()` method creates a loop that executes a step for each item in an array.

## Usage

```typescript
workflow.foreach(stepOne, { concurrency: 2 });
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "step",
      type: "Step",
      description:
        "The step instance to execute in the loop. The previous step must return an array type.",
      isOptional: false,
    },
    {
      name: "opts",
      type: "object",
      description:
        "Optional configuration for the loop. The concurrency option controls how many iterations can run in parallel (default: 1)",
      isOptional: true,
      properties: [
        {
          name: "concurrency",
          type: "number",
          description:
            "The number of concurrent iterations allowed (default: 1)",
          isOptional: true,
        },
      ],
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [For each](../../docs/workflows/control-flow.mdx#foreach)


---
title: "Reference: Workflow.map() | Building Workflows | Mastra Docs"
description: Documentation for the `.map()` method in workflows, which maps output data from a previous step to the input of a subsequent step.
---

# Workflow.map()
[EN] Source: https://mastra.ai/en/reference/workflows/map

The `.map()` method maps output data from a previous step to the input of a subsequent step, allowing you to transform data between steps.

## Usage

```typescript
const step1 = createStep({
  id: "step1",
  inputSchema: z.object({
    inputValue: z.string(),
  }),
  outputSchema: z.object({
    outputValue: z.string(),
  }),
  execute: async ({ inputData }) => {
    return { outputValue: inputData.inputValue };
  },
});

const step2 = createStep({
  id: "step2",
  inputSchema: z.object({
    unexpectedName: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async ({ inputData }) => {
    return { result: inputData.unexpectedName };
  },
});

const workflow = createWorkflow({
  id: "my-workflow",
  steps: [step1, step2],
  inputSchema: z.object({
    inputValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
});

workflow
  .then(step1)
  .map({
    unexpectedName: {
      step: step1,
      path: "outputValue",
    },
  })
  .then(step2)
  .commit();
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "mappingConfig",
      type: "object",
      description:
        "Configuration object that defines how data should be mapped between workflow steps, either as a mapping object or a mapping function",
      isOptional: false,
      properties: [
        {
          name: "step",
          type: "Step | Step[]",
          description: "The step(s) to map output from",
          isOptional: true,
        },
        {
          name: "path",
          type: "string",
          description: "Path to the output value in the step result",
          isOptional: true,
        },
        {
          name: "value",
          type: "any",
          description: "Static value to map",
          isOptional: true,
        },
        {
          name: "schema",
          type: "ZodType",
          description: "Schema for validating the mapped value",
          isOptional: true,
        },
        {
          name: "initData",
          type: "Step",
          description: "Step containing initial workflow data to map from",
          isOptional: true,
        },
        {
          name: "runtimeContextPath",
          type: "string",
          description: "Path to value in runtime context",
          isOptional: true,
        },
      ],
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Input data mapping](../../docs/workflows/input-data-mapping.mdx)


---
title: "Reference: Workflow.parallel() | Building Workflows | Mastra Docs"
description: Documentation for the `.parallel()` method in workflows, which executes multiple steps in parallel.
---

# Workflow.parallel()
[EN] Source: https://mastra.ai/en/reference/workflows/parallel

The `.parallel()` method executes multiple steps in parallel.

## Usage

```typescript
workflow.parallel([stepOne, stepTwo]);
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "steps",
      type: "Step[]",
      description: "The step instances to execute in parallel",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Parallel workflow example](../../examples/workflows/parallel-steps.mdx)


---
title: "Reference: Workflow.resume() | Building Workflows | Mastra Docs"
description: Documentation for the `.resume()` method in workflows, which resumes a suspended workflow run with new data.
---

# Workflow.resume()
[EN] Source: https://mastra.ai/en/reference/workflows/resume

The `.resume()` method resumes a suspended workflow run with new data, allowing you to continue execution from a specific step.

## Usage

```typescript
const run = await counterWorkflow.createRunAsync();
const result = await run.start({ inputData: { startValue: 0 } });

if (result.status === "suspended") {
  const resumedResults = await run.resume({
    step: result.suspended[0],
    resumeData: { newValue: 0 },
  });
}
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "params",
      type: "object",
      description: "Configuration object for resuming the workflow run",
      isOptional: false,
      properties: [
        {
          name: "resumeData",
          type: "ResumeSchema",
          description: "Data for resuming the suspended step",
          isOptional: true,
        },
        {
          name: "step",
          type: "Step | Step[] | string | string[]",
          description: "The step(s) to resume execution from",
          isOptional: false,
        },
        {
          name: "runtimeContext",
          type: "RuntimeContext",
          description: "Runtime context data to use when resuming",
          isOptional: true,
        },
      ],
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "resumedResults",
      type: "Promise<WorkflowResult<TOutput, TSteps>>",
      description:
        "A promise that resolves to the result of the resumed workflow run",
    },
  ]}
/>

## Related

- [Suspend and resume](../../docs/workflows/suspend-and-resume.mdx)
- [Human in the loop example](../../examples/workflows/human-in-the-loop.mdx)


---
title: "Reference: Workflow.sendEvent() | Building Workflows | Mastra Docs"
description: Documentation for the `.sendEvent()` method in workflows, which resumes execution when an event is sent.
---

# Workflow.sendEvent()
[EN] Source: https://mastra.ai/en/reference/workflows/sendEvent

The `.sendEvent()` resumes execution when an event is sent.

## Usage

```typescript
workflow.sendEvent('my-event-name', step1);
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "eventName",
      type: "string",
      description: "The name of the event to send",
      isOptional: false,
    },
    {
      name: "step",
      type: "Step",
      description: "The step to resume after the event is sent",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Sleep & Events](../../docs/workflows/pausing-execution.mdx)


---
title: "Reference: Workflow.sleep() | Building Workflows | Mastra Docs"
description: Documentation for the `.sleep()` method in workflows, which pauses execution for a specified number of milliseconds.
---

# Workflow.sleep()
[EN] Source: https://mastra.ai/en/reference/workflows/sleep

The `.sleep()` method pauses execution for a specified number of milliseconds.

## Usage

```typescript
workflow.sleep(1000);
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "milliseconds",
      type: "number",
      description: "The number of milliseconds to pause execution",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Sleep & Events](../../docs/workflows/pausing-execution.mdx)


---
title: "Reference: Workflow.sleepUntil() | Building Workflows | Mastra Docs"
description: Documentation for the `.sleepUntil()` method in workflows, which pauses execution until a specified date.
---

# Workflow.sleepUntil()
[EN] Source: https://mastra.ai/en/reference/workflows/sleepUntil

The `.sleepUntil()` method pauses execution until a specified date.

## Usage

```typescript
workflow.sleepUntil(new Date(Date.now() + 1000));
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "date",
      type: "Date",
      description: "The date until which to pause execution",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Sleep & Events](../../docs/workflows/pausing-execution.mdx)


---
title: "Reference: Snapshots | Workflow State Persistence | Mastra Docs"
description: "Technical reference on snapshots in Mastra - the serialized workflow state that enables suspend and resume functionality"
---

# Snapshots
[EN] Source: https://mastra.ai/en/reference/workflows/snapshots

In Mastra, a snapshot is a serializable representation of a workflow's complete execution state at a specific point in time. Snapshots capture all the information needed to resume a workflow from exactly where it left off, including:

- The current state of each step in the workflow
- The outputs of completed steps
- The execution path taken through the workflow
- Any suspended steps and their metadata
- The remaining retry attempts for each step
- Additional contextual data needed to resume execution

Snapshots are automatically created and managed by Mastra whenever a workflow is suspended, and are persisted to the configured storage system.

## The Role of Snapshots in Suspend and Resume

Snapshots are the key mechanism enabling Mastra's suspend and resume capabilities. When a workflow step calls `await suspend()`:

1. The workflow execution is paused at that exact point
2. The current state of the workflow is captured as a snapshot
3. The snapshot is persisted to storage
4. The workflow step is marked as "suspended" with a status of `'suspended'`
5. Later, when `resume()` is called on the suspended step, the snapshot is retrieved
6. The workflow execution resumes from exactly where it left off

This mechanism provides a powerful way to implement human-in-the-loop workflows, handle rate limiting, wait for external resources, and implement complex branching workflows that may need to pause for extended periods.

## Snapshot Anatomy

A Mastra workflow snapshot consists of several key components:

```typescript
export interface WorkflowRunState {
  // Core state info
  value: Record<string, string>; // Current state machine value
  context: {
    // Workflow context
    [key: string]: Record<
      string,
      | {
          status: "success";
          output: any;
        }
      | {
          status: "failed";
          error: string;
        }
      | {
          status: "suspended";
          payload?: any;
        }
    >;
    input: Record<string, any>; // Initial input data
  };

  activePaths: Array<{
    // Currently active execution paths
    stepPath: string[];
    stepId: string;
    status: string;
  }>;

  // Paths to suspended steps
  suspendedPaths: Record<string, number[]>;

  // Metadata
  runId: string; // Unique run identifier
  timestamp: number; // Time snapshot was created
}
```

## How Snapshots Are Saved and Retrieved

Mastra persists snapshots to the configured storage system. By default, snapshots are saved to a LibSQL database, but can be configured to use other storage providers like Upstash.
The snapshots are stored in the `workflow_snapshots` table and identified uniquely by the `run_id` for the associated run when using libsql.
Utilizing a persistence layer allows for the snapshots to be persisted across workflow runs, allowing for advanced human-in-the-loop functionality.

Read more about [libsql storage](../storage/libsql.mdx) and [upstash storage](../storage/upstash.mdx) here.

### Saving Snapshots

When a workflow is suspended, Mastra automatically persists the workflow snapshot with these steps:

1. The `suspend()` function in a step execution triggers the snapshot process
2. The `WorkflowInstance.suspend()` method records the suspended machine
3. `persistWorkflowSnapshot()` is called to save the current state
4. The snapshot is serialized and stored in the configured database in the `workflow_snapshots` table
5. The storage record includes the workflow name, run ID, and the serialized snapshot

### Retrieving Snapshots

When a workflow is resumed, Mastra retrieves the persisted snapshot with these steps:

1. The `resume()` method is called with a specific step ID
2. The snapshot is loaded from storage using `loadWorkflowSnapshot()`
3. The snapshot is parsed and prepared for resumption
4. The workflow execution is recreated with the snapshot state
5. The suspended step is resumed, and execution continues

## Storage Options for Snapshots

Mastra provides multiple storage options for persisting snapshots.

A `storage` instance is configured on the `Mastra` class, and is used to setup a snapshot persistence layer for all workflows registered on the `Mastra` instance.
This means that storage is shared across all workflows registered with the same `Mastra` instance.

### LibSQL (Default)

The default storage option is LibSQL, a SQLite-compatible database:

```typescript
import { Mastra } from "@mastra/core/mastra";
import { DefaultStorage } from "@mastra/core/storage/libsql";

const mastra = new Mastra({
  storage: new DefaultStorage({
    config: {
      url: "file:storage.db", // Local file-based database
      // For production:
      // url: process.env.DATABASE_URL,
      // authToken: process.env.DATABASE_AUTH_TOKEN,
    },
  }),
  workflows: {
    weatherWorkflow,
    travelWorkflow,
  },
});
```

### Upstash (Redis-Compatible)

For serverless environments:

```typescript
import { Mastra } from "@mastra/core/mastra";
import { UpstashStore } from "@mastra/upstash";

const mastra = new Mastra({
  storage: new UpstashStore({
    url: process.env.UPSTASH_URL,
    token: process.env.UPSTASH_TOKEN,
  }),
  workflows: {
    weatherWorkflow,
    travelWorkflow,
  },
});
```

## Best Practices for Working with Snapshots

1. **Ensure Serializability**: Any data that needs to be included in the snapshot must be serializable (convertible to JSON).

2. **Minimize Snapshot Size**: Avoid storing large data objects directly in the workflow context. Instead, store references to them (like IDs) and retrieve the data when needed.

3. **Handle Resume Context Carefully**: When resuming a workflow, carefully consider what context to provide. This will be merged with the existing snapshot data.

4. **Set Up Proper Monitoring**: Implement monitoring for suspended workflows, especially long-running ones, to ensure they are properly resumed.

5. **Consider Storage Scaling**: For applications with many suspended workflows, ensure your storage solution is appropriately scaled.

## Advanced Snapshot Patterns

### Custom Snapshot Metadata

When suspending a workflow, you can include custom metadata that can help when resuming:

```typescript
await suspend({
  reason: "Waiting for customer approval",
  requiredApprovers: ["manager", "finance"],
  requestedBy: currentUser,
  urgency: "high",
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
});
```

This metadata is stored with the snapshot and available when resuming.

### Conditional Resumption

You can implement conditional logic based on the suspend payload when resuming:

```typescript
run.watch(async ({ activePaths }) => {
  const isApprovalStepSuspended =
    activePaths.get("approval")?.status === "suspended";
  if (isApprovalStepSuspended) {
    const payload = activePaths.get("approval")?.suspendPayload;
    if (payload.urgency === "high" && currentUser.role === "manager") {
      await resume({
        stepId: "approval",
        context: { approved: true, approver: currentUser.id },
      });
    }
  }
});
```

## Related

- [Suspend and resume](../../docs/workflows/suspend-and-resume.mdx)
- [Human in the loop example](../../examples/workflows/human-in-the-loop.mdx)
- [Watch Function Reference](./watch.mdx)


---
title: "Reference: Workflow.start() | Building Workflows | Mastra Docs"
description: Documentation for the `.start()` method in workflows, which starts a workflow run with input data.
---

# Workflow.start()
[EN] Source: https://mastra.ai/en/reference/workflows/start

The `.start()` method starts a workflow run with input data, allowing you to execute the workflow from the beginning.

## Usage

```typescript
const run = await myWorkflow.createRunAsync();

// Start the workflow with input data
const result = await run.start({
  inputData: {
    startValue: "initial data",
  },
});
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "params",
      type: "object",
      description: "Configuration object for starting the workflow run",
      isOptional: false,
      properties: [
        {
          name: "inputData",
          type: "z.infer<TInput>",
          description: "Input data matching the workflow's input schema",
          isOptional: true,
        },
        {
          name: "runtimeContext",
          type: "RuntimeContext",
          description: "Runtime context data to use when starting the workflow",
          isOptional: true,
        },
      ],
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "result",
      type: "Promise<WorkflowResult<TOutput, TSteps>>",
      description: "A promise that resolves to the result of the workflow run",
    },
  ]}
/>

## Related

- [Running workflows](../../docs/workflows/overview.mdx#running-workflows)
- [Create run reference](./create-run.mdx)


---
title: "Reference: Step | Building Workflows | Mastra Docs"
description: Documentation for the Step class, which defines individual units of work within a workflow.
---

# Step
[EN] Source: https://mastra.ai/en/reference/workflows/step

The Step class defines individual units of work within a workflow, encapsulating execution logic, data validation, and input/output handling.
It can take either a tool or an agent as a parameter to automatically create a step from them.

## Usage

```typescript
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

const processOrder = createStep({
  id: "processOrder",
  inputSchema: z.object({
    orderId: z.string(),
    userId: z.string(),
  }),
  outputSchema: z.object({
    status: z.string(),
    orderId: z.string(),
  }),
  resumeSchema: z.object({
    orderId: z.string(),
  }),
  suspendSchema: z.object({}),
  execute: async ({
    inputData,
    mastra,
    getStepResult,
    getInitData,
    suspend,
    runtimeContext,
    runCount
    runId,
  }) => {
    return {
      status: "processed",
      orderId: inputData.orderId,
    };
  },
});
```

## Constructor Parameters

<PropertiesTable
  content={[
    {
      name: "id",
      type: "string",
      description: "Unique identifier for the step",
      required: true,
    },
    {
      name: "description",
      type: "string",
      description: "Optional description of what the step does",
      required: false,
    },
    {
      name: "inputSchema",
      type: "z.ZodType<any>",
      description: "Zod schema defining the input structure",
      required: true,
    },
    {
      name: "outputSchema",
      type: "z.ZodType<any>",
      description: "Zod schema defining the output structure",
      required: true,
    },
    {
      name: "resumeSchema",
      type: "z.ZodType<any>",
      description: "Optional Zod schema for resuming the step",
      required: false,
    },
    {
      name: "suspendSchema",
      type: "z.ZodType<any>",
      description: "Optional Zod schema for suspending the step",
      required: false,
    },
    {
      name: "execute",
      type: "(params: ExecuteParams) => Promise<any>",
      description: "Async function containing step logic",
      required: true,
    }
  ]}
/>

### ExecuteParams

<PropertiesTable
  content={[
    {
      name: "inputData",
      type: "z.infer<TStepInput>",
      description: "The input data matching the inputSchema",
    },
    {
      name: "resumeData",
      type: "z.infer<TResumeSchema>",
      description:
        "The resume data matching the resumeSchema, when resuming the step from a suspended state. Only exists if the step is being resumed.",
    },
    {
      name: "mastra",
      type: "Mastra",
      description: "Access to Mastra services (agents, tools, etc.)",
    },
    {
      name: "getStepResult",
      type: "(stepId: string) => any",
      description: "Function to access results from other steps",
    },
    {
      name: "getInitData",
      type: "() => any",
      description:
        "Function to access the initial input data of the workflow in any step",
    },
    {
      name: "suspend",
      type: "() => Promise<void>",
      description: "Function to pause workflow execution",
    },
    {
      name: "runId",
      type: "string",
      description: "Current run id",
    },
    {
      name: "runtimeContext",
      type: "RuntimeContext",
      isOptional: true,
      description:
        "Runtime context for dependency injection and contextual information.",
    },
    {
      name: "runCount",
      type: "number",
      description: "The run count for this specific step, it automatically increases each time the step runs",
      isOptional: true,
    }
  ]}
/>

## Related

- [Control flow](../../docs/workflows/control-flow.mdx)
- [Using agents and tools](../../docs/workflows/using-with-agents-and-tools.mdx)
- [Tool and agent as step example](../../examples/workflows/agent-and-tool-interop.mdx)
- [Input data mapping](../../docs/workflows/input-data-mapping.mdx)


---
title: "Reference: Workflow.stream() | Building Workflows | Mastra Docs"
description: Documentation for the `.stream()` method in workflows, which allows you to monitor the execution of a workflow run as a stream.
---

# Run.stream()
[EN] Source: https://mastra.ai/en/reference/workflows/stream

The `.stream()` method allows you to monitor the execution of a workflow run, providing real-time updates on the status of steps.

## Usage

```typescript
const run = await myWorkflow.createRunAsync();

// Add a stream to monitor execution
const result = run.stream({ inputData: {...} });


for (const chunk of stream) {
  // do something with the chunk
}
```

## Messages

<PropertiesTable
  content={[
    {
      name: "start",
      type: "object",
      description: "The workflow starts",
      isOptional: false,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "example",
              type: "{ type: 'start', payload: { runId: '1' } }",
              description: "Example message structure",
              isOptional: false,
            },
          ],
        },
      ],
    },
    {
      name: "step-start",
      type: "object",
      description: "The start of a step",
      isOptional: false,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "example",
              type: "{ type: 'step-start', payload: { id: 'fetch-weather' } }",
              description: "Example message structure",
              isOptional: false,
            },
          ],
        },
      ],
    },
    {
      name: "tool-call",
      type: "object",
      description: "A tool call has started",
      isOptional: false,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "example",
              type: "{ type: 'tool-call', toolCallId: 'weatherAgent', toolName: 'Weather Agent', args: { prompt: 'Based on the following weather forecast for New York, suggest appropriate activities:...' } }",
              description: "Example message structure",
              isOptional: false,
            },
          ],
        },
      ],
    },
    {
      name: "tool-call-streaming-start",
      type: "object",
      description: "A tool call/agent has started",
      isOptional: false,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "example",
              type: "{ type: 'tool-call-streaming-start', toolCallId: 'weatherAgent', toolName: 'Weather Agent', args: { prompt: 'Based on the following weather forecast for New York, suggest appropriate activities:...' } }",
              description: "Example message structure",
              isOptional: false,
            },
          ],
        },
      ],
    },
    {
      name: "tool-call-delta",
      type: "object",
      description: "The delta of the tool output",
      isOptional: false,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "example",
              type: "{ type: 'tool-call-delta', toolCallId: 'weatherAgent', toolName: 'Weather Agent', args: { prompt: 'Based on the following weather forecast for New York, suggest appropriate activities:\\n' + '            [\\n' + '  {\\n' + '    \"date\": \"2025-05-16\",\\n' + '    \"maxTemp\": 22.2,\\n' + '    \"minTemp\": 16,\\n' + '    \"precipitationChance\": 5,\\n' + '    \"condition\": \"Dense drizzle\",\\n' + '    \"location\": \"New York\"\\n' + '  },\\n' + '            ' }, argsTextDelta: '📅' }",
              description: "Example message structure",
              isOptional: false,
            },
          ],
        },
      ],
    },
    {
      name: "step-result",
      type: "object",
      description: "The result of a step",
      isOptional: false,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "example",
              type: "{ type: 'step-result', payload: { id: 'Weather Agent', status: 'success', output: [Object] } }",
              description: "Example message structure",
              isOptional: false,
            },
          ],
        },
      ],
    },
    {
      name: "step-finish",
      type: "object",
      description: "The end of a step",
      isOptional: false,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "example",
              type: "{ type: 'step-finish', payload: { id: 'Weather Agent', metadata: {} } }",
              description: "Example message structure",
              isOptional: false,
            },
          ],
        },
      ],
    },
    {
      name: "finish",
      type: "object",
      description: "The end of the workflow",
      isOptional: false,
      properties: [
        {
          type: "object",
          parameters: [
            {
              name: "example",
              type: "{ type: 'finish', payload: { runId: '1' } }",
              description: "Example message structure",
              isOptional: false,
            },
          ],
        },
      ],
    },
  ]}
/>

## Parameters

<PropertiesTable
  content={[
    {
      name: "params",
      type: "object",
      description: "Configuration object for starting the workflow run",
      isOptional: false,
      properties: [
        {
          name: "inputData",
          type: "z.infer<TInput>",
          parameters: [
            {
              name: "z.infer<TInput>",
              type: "inputData",
              description:
                "Runtime context data to use when starting the workflow",
              isOptional: true,
            },
          ],
        },
        {
          name: "runtimeContext",
          type: "RuntimeContext",
          parameters: [
            {
              name: "runtimeContext",
              type: "RuntimeContext",
              description:
                "Runtime context data to use when starting the workflow",
              isOptional: true,
            },
          ],
        },
      ],
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "result",
      type: "Promise<WorkflowResult<TOutput, TSteps>>",
      description: "A stream that pipes each step to the stream",
    },
  ]}
/>


---
title: "Reference: Workflow.then() | Building Workflows | Mastra Docs"
description: Documentation for the `.then()` method in workflows, which creates sequential dependencies between steps.
---

# Workflow.then()
[EN] Source: https://mastra.ai/en/reference/workflows/then

The `.then()` method creates a sequential dependency between workflow steps, ensuring steps execute in a specific order.

## Usage

```typescript
workflow.then(stepOne).then(stepTwo);
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "step",
      type: "Step",
      description:
        "The step instance that should execute after the previous step completes",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "NewWorkflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Control flow](../../docs/workflows/control-flow.mdx)


---
title: "Reference: Workflow.waitForEvent() | Building Workflows | Mastra Docs"
description: Documentation for the `.waitForEvent()` method in workflows, which pauses execution until an event is received.
---

# Workflow.waitForEvent()
[EN] Source: https://mastra.ai/en/reference/workflows/waitForEvent

The `.waitForEvent()` method pauses execution until an event is received.

## Usage

```typescript
workflow.waitForEvent('my-event-name', step1);
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "eventName",
      type: "string",
      description: "The name of the event to wait for",
      isOptional: false,
    },
    {
      name: "step",
      type: "Step",
      description: "The step to resume after the event is received",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "workflow",
      type: "Workflow",
      description: "The workflow instance for method chaining",
    },
  ]}
/>

## Related

- [Sleep & Events](../../docs/workflows/pausing-execution.mdx)


---
title: "Reference: Workflow.watch() | Building Workflows | Mastra Docs"
description: Documentation for the `.watch()` method in workflows, which allows you to monitor the execution of a workflow run.
---

# Workflow.watch()
[EN] Source: https://mastra.ai/en/reference/workflows/watch

The `.watch()` method allows you to monitor the execution of a workflow run, providing real-time updates on the status of steps.

## Usage

```typescript
const run = await myWorkflow.createRunAsync();

// Add a watcher to monitor execution
run.watch(event => {
  console.log('Step completed:', event.payload.currentStep.id);
});

// Start the workflow
const result = await run.start({ inputData: {...} });
```

## Parameters

<PropertiesTable
  content={[
    {
      name: "cb",
      type: "(event: WatchEvent) => void",
      description:
        "A callback function that is called whenever a step is completed or the workflow state changes",
      isOptional: false,
    },
  ]}
/>

## Returns

<PropertiesTable
  content={[
    {
      name: "unwatch",
      type: "() => void",
      description:
        "A function that can be called to stop watching the workflow run",
    },
  ]}
/>

## Related

- [Suspend and resume](../../docs/workflows/suspend-and-resume.mdx)
- [Human in the loop example](../../examples/workflows/human-in-the-loop.mdx)
- [Snapshot Reference](./snapshots.mdx)
- [Workflow watch guide](../../docs/workflows/overview.mdx#watching-workflow-execution)


---
title: "Reference: Workflow Class | Building Workflows | Mastra Docs"
description: Documentation for the Workflow class in Mastra, which enables you to create state machines for complex sequences of operations with conditional branching and data validation.
---

# Workflow Class
[EN] Source: https://mastra.ai/en/reference/workflows/workflow

The Workflow class enables you to create state machines for complex sequences of operations with conditional branching and data validation.

## Usage

```typescript
const myWorkflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({
    startValue: z.string(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  steps: [step1, step2, step3], // Declare steps used in this workflow
})
  .then(step1)
  .then(step2)
  .then(step3)
  .commit();

const mastra = new Mastra({
  workflows: {
    myWorkflow,
  },
});

const run = await mastra.getWorkflow("myWorkflow").createRunAsync();
```

## API Reference

### Constructor

<PropertiesTable
  content={[
    {
      name: "id",
      type: "string",
      description: "Unique identifier for the workflow",
    },
    {
      name: "inputSchema",
      type: "z.ZodType<any>",
      description: "Zod schema defining the input structure for the workflow",
    },
    {
      name: "outputSchema",
      type: "z.ZodType<any>",
      description: "Zod schema defining the output structure for the workflow",
    },
    {
      name: "steps",
      type: "Step[]",
      description: "Array of steps to include in the workflow",
    },
  ]}
/>

### Core Methods

#### `then()`

Adds a step to the workflow sequentially. Returns the workflow instance for chaining.

#### `parallel()`

Executes multiple steps concurrently. Takes an array of steps and returns the workflow instance.

#### `branch()`

Creates conditional branching logic. Takes an array of tuples containing condition functions and steps to execute when conditions are met.

#### `dowhile()`

Creates a loop that executes a step repeatedly while a condition remains true. The condition is checked after each execution.

#### `dountil()`

Creates a loop that executes a step repeatedly until a condition becomes true. The condition is checked after each execution.

#### `foreach()`

Iterates over an array and executes a step for each element. Accepts optional concurrency configuration.

#### `map()`

Maps data between steps using either a mapping configuration object or a mapping function. Useful for transforming data between steps.

#### `commit()`

Validates and finalizes the workflow configuration. Must be called after adding all steps.

#### `createRun()`

Deprecated. Creates a new workflow run instance, allowing you to execute the workflow with specific input data. Accepts optional run ID.

#### `createRunAsync()`

Creates a new workflow run instance, allowing you to execute the workflow with specific input data. Accepts optional run ID. Stores a pending workflow run snapshot into storage.

#### `execute()`

Executes the workflow with provided input data. Handles workflow suspension, resumption and emits events during execution.

## Workflow Status

A workflow's status indicates its current execution state. The possible values are:

<PropertiesTable
  content={[
    {
      name: "success",
      type: "string",
      description:
        "All steps finished executing successfully, with a valid result output",
    },
    {
      name: "failed",
      type: "string",
      description:
        "Workflow encountered an error during execution, with error details available",
    },
    {
      name: "suspended",
      type: "string",
      description:
        "Workflow execution is paused waiting for resume, with suspended step information",
    },
  ]}
/>

## Passing Context Between Steps

Steps can access data from previous steps in the workflow through the context object. Each step receives the accumulated context from all previous steps that have executed.

```typescript
workflow
  .then({
    id: "getData",
    execute: async ({ inputData }) => {
      return {
        data: { id: "123", value: "example" },
      };
    },
  })
  .then({
    id: "processData",
    execute: async ({ inputData }) => {
      // Access data from previous step through context.steps
      const previousData = inputData.data;
      // Process previousData.id and previousData.value
    },
  });
```

## Related

- [Control flow](../../docs/workflows/flow-control.mdx)


---
title: "Showcase"
description: "Check out these applications built with Mastra"
---
[EN] Source: https://mastra.ai/en/showcase

import { ShowcaseGrid } from "@/components/showcase-grid";

<ShowcaseGrid />
