import { generateText, stepCountIs } from "ai";
import { createBashTool } from "bash-tool";

export async function runAgent(prompt: string, files: Record<string, string>): Promise<string> {
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

  const result = await generateText({
    model: "anthropic/claude-opus-4-6",
    tools,
    stopWhen: stepCountIs(30),
    system: [
      "You are a helpful assistant that explores Purdue Hackers' Notion workspace.",
      "The workspace is mounted as a filesystem. Use bash commands to navigate and search.",
      "Always start by listing the relevant directory to understand the structure.",
      "When answering questions, cite the specific pages you found information in.",
    ].join("\n"),
    prompt,
  });

  return result.text;
}
