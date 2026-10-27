// jot vs HTML token benchmark.
//
//   npm i @anthropic-ai/sdk
//   node docs/benchmark/bench.mjs              # exact token counts for the two reference files (free)
//   node docs/benchmark/bench.mjs --generate   # also generate both formats from brief.md and record billed usage (costs money)
//
// Credentials: ANTHROPIC_API_KEY, or a profile from `ant auth login`.
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(here, p), "utf8");
const MODEL = process.env.BENCH_MODEL || "claude-opus-5-5";
const PRICES = { // $ per million tokens: input, output, cache read
  "claude-fable-5-1": [10, 50, 0.25],
  "claude-opus-5-5": [4, 20, 0.2],
  "claude-sonnet-5-5": [2, 10, 0.2],
  "claude-haiku-5-5": [0.1, 0.5, 0.01],
};
const client = new Anthropic();

async function count(text) {
  const r = await client.messages.countTokens({ model: MODEL, messages: [{ role: "user", content: text }] });
  return r.input_tokens;
}

// 1. Exact counts (subtract the fixed per-message overhead)
const overhead = await count(".");
const files = {
  "launch-plan.jot": read("launch-plan.jot"),
  "launch-plan.html": read("launch-plan.html"),
  "JOTX_FOR_AI.jot (primer)": read("../../jotx-help/JOTX_FOR_AI.jot"),
};
console.log(`Exact token counts on ${MODEL}`);
for (const [name, text] of Object.entries(files)) {
  console.log(`  ${name.padEnd(28)} ${String((await count(text)) - overhead).padStart(6)} tokens  ${Buffer.byteLength(text)} bytes`);
}

// 2. Optional: real generation runs from the same brief
if (process.argv.includes("--generate")) {
  const brief = read("brief.md");
  const primer = files["JOTX_FOR_AI.jot (primer)"];
  const [pin, pout, pcache] = PRICES[MODEL] || [0, 0, 0];
  const runs = [
    {
      name: "jot",
      // The primer is the format reference a model needs for .jot; cached so repeat runs read it at cache price
      system: [
        { type: "text", text: "You write jotx .jot documents. Syntax reference:\n\n" + primer, cache_control: { type: "ephemeral" } },
      ],
      prompt: `Write the document below as a single .jot file using widgets (progress, kanban, timeline, decision) where they fit. Output only the file.\n\n${brief}`,
    },
    {
      name: "html",
      system: "You write polished, self-contained HTML documents.",
      prompt: `Write the document below as one self-contained, modern, styled HTML page (inline CSS; Mermaid and Chart.js from a CDN). Render the progress bars, Kanban board, timeline and decision record as styled components. Output only the HTML.\n\n${brief}`,
    },
  ];
  for (const run of runs) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      // Server-side fallback: if a safety classifier declines, Anthropic re-runs on its recommended model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: run.system,
      messages: [{ role: "user", content: run.prompt }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") { console.log(`  ${run.name}: refused`); continue; }
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    fs.writeFileSync(path.join(here, `generated-${MODEL}.${run.name === "jot" ? "jot" : "html"}`), text);
    const u = msg.usage;
    const cost = ((u.input_tokens + (u.cache_creation_input_tokens || 0) * 1.25) * pin + u.output_tokens * pout + (u.cache_read_input_tokens || 0) * pcache) / 1e6;
    console.log(`  ${run.name.padEnd(5)} output ${u.output_tokens} (incl. thinking)  input ${u.input_tokens}  cache read ${u.cache_read_input_tokens || 0}  ≈ $${cost.toFixed(4)}  served by ${msg.model}`);
  }
}
