import { generateText, streamText, stepCountIs } from "ai";
import { createBashTool } from "bash-tool";
import type { RequestLogger } from "evlog";

export async function runAgent(
  prompt: string,
  files: Record<string, string>,
  log: RequestLogger,
): Promise<string> {
  const { tools } = await createBashTool({
    files,
    destination: "/",
    extraInstructions: [
      "You are exploring Purdue Hackers' Notion workspace mounted as a filesystem.",
      "Root directories: /Home, /Design, /Engineering, /Comms, /Finances, /Events",
      "Each page is a .md file. Use ls, cat, grep, find, head, tail, etc.",
      "Directories correspond to Notion page hierarchies.",
    ].join("\n"),
  });

  const model = "anthropic/claude-haiku-4.5";
  const maxSteps = 30;

  log.set({ agent: { model, maxSteps } });

  const result = await generateText({
    model,
    tools,
    stopWhen: stepCountIs(maxSteps),
    system: [
      "You are a helpful assistant that explores Purdue Hackers' Notion workspace.",
      "The workspace is mounted as a filesystem. Use bash commands to navigate and search.",
      "Always start by listing the relevant directory to understand the structure.",
      "When answering questions, cite the specific pages you found information in.",
    ].join("\n"),
    prompt,
    experimental_onStepStart: (event) => {
      log.info(`step ${event.stepNumber} started`);
    },
    experimental_onToolCallStart: (event) => {
      log.info(`tool call: ${event.toolCall.toolName}`, {
        input: event.toolCall.input,
      });
    },
    experimental_onToolCallFinish: (event) => {
      if (event.success) {
        log.info(`tool done: ${event.toolCall.toolName} (${event.durationMs}ms)`);
      } else {
        log.error(`tool failed: ${event.toolCall.toolName} (${event.durationMs}ms)`, {
          error: event.error,
        });
      }
    },
    onStepFinish: (event) => {
      log.info(`step ${event.stepNumber} finished`, {
        finishReason: event.finishReason,
        usage: {
          inputTokens: event.usage.inputTokens,
          outputTokens: event.usage.outputTokens,
        },
      });
    },
    onFinish: (event) => {
      log.set({
        agent: {
          steps: event.steps.length,
          finishReason: event.finishReason,
          usage: {
            inputTokens: event.totalUsage.inputTokens,
            outputTokens: event.totalUsage.outputTokens,
          },
        },
      });
    },
  });

  return result.text;
}

export function streamAgent(prompt: string, files: Record<string, string>, log: RequestLogger) {
  const agentPromise = createBashTool({
    files,
    destination: "/",
    extraInstructions: [
      "You are exploring Purdue Hackers' Notion workspace mounted as a filesystem.",
      "Root directories: /Home, /Design, /Engineering, /Comms, /Finances, /Events",
      "Each page is a .md file. Use ls, cat, grep, find, head, tail, etc.",
      "Directories correspond to Notion page hierarchies.",
    ].join("\n"),
  }).then(({ tools }) => {
    const model = "anthropic/claude-haiku-4.5";
    const maxSteps = 30;

    log.set({ agent: { model, maxSteps } });

    return streamText({
      model,
      tools,
      stopWhen: stepCountIs(maxSteps),
      system: [
        "You are a helpful assistant that explores Purdue Hackers' Notion workspace.",
        "The workspace is mounted as a filesystem. Use bash commands to navigate and search.",
        "Always start by listing the relevant directory to understand the structure.",
        "When answering questions, cite the specific pages you found information in.",
      ].join("\n"),
      prompt,
      onStepFinish: (event) => {
        log.info(`step ${event.stepNumber} finished`, {
          finishReason: event.finishReason,
          usage: {
            inputTokens: event.usage.inputTokens,
            outputTokens: event.usage.outputTokens,
          },
        });
      },
      onFinish: (event) => {
        log.set({
          agent: {
            steps: event.steps.length,
            finishReason: event.finishReason,
            usage: {
              inputTokens: event.totalUsage.inputTokens,
              outputTokens: event.totalUsage.outputTokens,
            },
          },
        });
      },
    });
  });

  return agentPromise;
}
