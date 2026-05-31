import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
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

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY env var on the server." },
      { status: 500 },
    );
  }
  const body = (await req.json()) as RequestBody;
  if (!body?.prompt || !body?.deal) {
    return NextResponse.json({ error: "Missing prompt or deal." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey });

  // Build the message array from prior turns + the new user prompt.
  const messages: ChatCompletionMessageParam[] = [{ role: "system", content: SYSTEM_PROMPT }];
  for (const t of body.history) {
    messages.push({ role: t.role, content: t.content });
  }
  messages.push({ role: "user", content: body.prompt });

  let workingDeal: Deal = body.deal;
  const toolEvents: Array<{ name: string; input: unknown; output: unknown }> = [];
  let finalText = "";

  for (let step = 0; step < 8; step++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOL_SPECS as unknown as ChatCompletionTool[],
      tool_choice: "auto",
      temperature: 0.2,
    });

    const choice = response.choices[0];
    if (!choice) break;
    const msg = choice.message;

    // Capture assistant content (may coexist with tool calls).
    if (msg.content) finalText = msg.content.trim();

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      // No more tool calls — we have the final answer.
      break;
    }

    // Append the assistant turn (with tool_calls) so we can attach matching
    // tool responses on the next iteration.
    messages.push({
      role: "assistant",
      content: msg.content ?? "",
      tool_calls: msg.tool_calls,
    });

    for (const tc of msg.tool_calls) {
      if (tc.type !== "function") continue;
      let parsed: Record<string, unknown> = {};
      try {
        parsed = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch {
        // Malformed args — feed the error back as the tool result.
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify({ error: "Invalid JSON arguments." }),
        });
        continue;
      }
      const { deal: nextDeal, output } = dispatchTool(workingDeal, tc.function.name, parsed);
      workingDeal = nextDeal;
      toolEvents.push({ name: tc.function.name, input: parsed, output });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(output),
      });
    }
  }

  return NextResponse.json({ reply: finalText, deal: workingDeal, toolEvents });
}
