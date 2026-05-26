import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { TOOL_SPECS, dispatchTool } from "@/lib/ai/tools";
import type { Deal } from "@/lib/types";

export const runtime = "nodejs";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  deal: Deal;
  history: ChatTurn[];
  prompt: string;
}

const MODEL = "claude-opus-4-7";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing ANTHROPIC_API_KEY env var on the server." },
      { status: 500 },
    );
  }
  const body = (await req.json()) as RequestBody;
  if (!body?.prompt || !body?.deal) {
    return NextResponse.json({ error: "Missing prompt or deal." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  // Multi-turn message array constructed from prior assistant/user turns plus
  // the new user prompt. We feed tool-use back into the model in a loop.
  const messages: Anthropic.MessageParam[] = body.history.map((t) => ({
    role: t.role,
    content: t.content,
  }));
  messages.push({ role: "user", content: body.prompt });

  let workingDeal: Deal = body.deal;
  const toolEvents: Array<{ name: string; input: unknown; output: unknown }> = [];
  let finalText = "";

  for (let step = 0; step < 8; step++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: TOOL_SPECS,
      messages,
    });

    // Capture any text blocks emitted alongside tool calls.
    const textChunks: string[] = [];
    const toolUses: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === "text") textChunks.push(block.text);
      if (block.type === "tool_use") toolUses.push(block);
    }
    if (textChunks.length) finalText = textChunks.join("\n").trim();

    if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
      break;
    }

    // Append the assistant turn that includes tool_use blocks so we can reply
    // with matching tool_result blocks on the next iteration.
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const { deal: nextDeal, output } = dispatchTool(workingDeal, tu.name, tu.input as Record<string, unknown>);
      workingDeal = nextDeal;
      toolEvents.push({ name: tu.name, input: tu.input, output });
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(output),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({
    reply: finalText,
    deal: workingDeal,
    toolEvents,
  });
}
