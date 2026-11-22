# Multi-model eval, 2026-11-22

The 5 briefing questions (`lib/questions.ts`), 3 runs each, through the same `ask()` code path as the app: the same system prompt, the same four tools, `Output.object` for the final answer, at most 4 steps. Each run gets the same checks as `pnpm eval` (7 or 8 per question, 36 per round, 108 per model).

Reproduce (needs a loaded database, `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, and `OPENROUTER_API_KEY` for the non-Claude models):

```bash
pnpm eval --model=claude-sonnet-5-5 --runs=3 --save
pnpm eval --model=openai/gpt-6.2-astra --runs=3 --save
```

`--save` writes `evals/<date>-<model>.json` with every run (checks, answer, usage, latency, cost) and the summary below.

## Summary

| Model | Route | Status | Checks passed | Mean latency | Max latency | Mean cost per question |
| --- | --- | --- | --- | --- | --- | --- |
| `claude-sonnet-5-5` | Anthropic direct | ok | 108/108 (100%) | 9.3 s | 11.5 s | $0.0271 |
| `claude-haiku-5-5` | Anthropic direct | ok | 106/108 (98.1%) | 13.6 s | 19.5 s | $0.0026 |
| `openai/gpt-6.2-astra` | OpenRouter | ok | 108/108 (100%) | 11.3 s | 26.2 s | $0.0765 |
| `google/gemini-4-argon` | OpenRouter | interrupted: too slow (over 11 min for 15 questions, stopped by the owner) | 101/101 in 14 of 15 runs | 57.9 s | 108.0 s | $0.0702 |
| `deepseek/deepseek-v4-pro-0813` | OpenRouter | unsupported: no tool call in any run | 49/108 (45.4%) | 4.9 s | 17.5 s | $0.0032 |
| `moonshotai/kimi-k3.1-pro` | OpenRouter | unsupported: no tool call in any run | 44/108 (40.7%) | 7.5 s | 15.0 s | $0.0035 |

Means are per question (one run of one question). The Gemini row comes from the console log of the stopped run (`2026-11-22-google-gemini-4-argon.partial.log`); the script writes its JSON only at the end, so that run has no JSON file.

## Per question

Checks passed over the 3 runs.

| Model | Q1 open incidents | Q2 W-17 outage | Q3 repeat failure | Q4 Wadi water cut | Q5 sand alarm |
| --- | --- | --- | --- | --- | --- |
| `claude-sonnet-5-5` | 21/21 | 21/21 | 24/24 | 21/21 | 21/21 |
| `claude-haiku-5-5` | 21/21 | 20/21 | 23/24 | 21/21 | 21/21 |
| `openai/gpt-6.2-astra` | 21/21 | 21/21 | 24/24 | 21/21 | 21/21 |
| `google/gemini-4-argon` | 21/21 | 21/21 | 24/24 | 21/21 | 14/14 (2 runs) |
| `deepseek/deepseek-v4-pro-0813` | 11/21 | 13/21 | 8/24 | 8/21 | 9/21 |
| `moonshotai/kimi-k3.1-pro` | 9/21 | 9/21 | 8/24 | 9/21 | 9/21 |

## Steps, tool calls and tokens

Means per question. Input is uncached input; cache read and cache write are the cached parts of the prompt.

| Model | Steps | Tool calls | Input | Cache read | Cache write | Output | Prompt caching applied |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude-sonnet-5-5` | 2.93 | 2.73 | 8 | 23,855 | 5,923 | 992 | yes |
| `claude-haiku-5-5` | 2.60 | 2.27 | 7 | 17,925 | 9,273 | 2,524 | yes |
| `openai/gpt-6.2-astra` | 2.73 | 2.60 | 0 | 11,192 | 4,889 | 579 | yes |
| `google/gemini-4-argon` | 3.36 | 3.93 | 20,125 | 13,115 | 0 | 2,868 | yes |
| `deepseek/deepseek-v4-pro-0813` | 1.00 | 0 | 2,431 | 1,425 | 0 | 229 | yes |
| `moonshotai/kimi-k3.1-pro` | 1.00 | 0 | 739 | 3,315 | 0 | 308 | yes |

For `openai/gpt-6.2-astra`, OpenRouter reported every uncached prompt token as a cache write, so uncached input is 0. Token counts come from each model's own tokenizer and do not compare across models.

## Failures by check

- `claude-haiku-5-5`: "cites the W-17 incident note (IN-032)" 1 of 3 runs; "answer names W-09, W-17 and W-27" 1 of 3 runs.
- `claude-sonnet-5-5`, `openai/gpt-6.2-astra`, `google/gemini-4-argon` (14 runs): none.
- `deepseek/deepseek-v4-pro-0813` and `moonshotai/kimi-k3.1-pro`: in all 15 runs the model returned the structured answer in the first step without calling a tool, so the answer has no data from the database. Most question-specific checks failed in every run. The checks that passed are ones an answer can meet without data: the month taken from the question, a dollar figure, or no chart and no sources. "answer has 2 to 4 sentences" failed 10 times (DeepSeek) and 14 times (Kimi). The full counts are in the JSON files.

Unsupported means: this setup (AI SDK `streamText` with tools and `Output.object`) sends the JSON schema as `response_format` with the tools on every step. Through OpenRouter, these two models answered in JSON at once and never called a tool. No run raised an error.

## Models and prices

OpenRouter ids, upstream providers and prices come from `https://openrouter.ai/api/v1/models` on 2026-11-22. Each model listed `tools` and `structured_outputs` in `supported_parameters`. Prices are in US dollars per million tokens.

| Model | Upstream provider(s) seen | Input | Output | Cache read | Cache write | Cost source |
| --- | --- | --- | --- | --- | --- | --- |
| `claude-sonnet-5-5` | Anthropic | 2.00 | 10.00 | 0.10 | 2.50 (5 min) | Anthropic price list |
| `claude-haiku-5-5` | Anthropic | 0.10 | 0.50 | 0.01 | 0.125 (5 min) | Anthropic price list |
| `openai/gpt-6.2-astra` | Amazon Bedrock | 8.00 | 40.00 | 0.40 | 10.00 | cost reported by OpenRouter |
| `google/gemini-4-argon` | not recorded (run stopped) | 2.00 | 10.00 | 0.10 | 0.1875 | cost reported by OpenRouter |
| `deepseek/deepseek-v4-pro-0813` | Together, Nebius, CoreWeave, Parasail, Baidu, Wafer | 1.32 | 3.96 | 0.044 | none listed | cost reported by OpenRouter |
| `moonshotai/kimi-k3.1-pro` | Wafer | 0.2403 | 8.4023 | 0.20 | none listed | cost reported by OpenRouter |

Claude prices: Sonnet 5.5 $2 / $10 with cache reads at $0.10; Haiku 5.5 $0.10 / $0.50 for prompts up to 100K tokens. Haiku cache prices use the standard multipliers (read 0.1x, 5 minute write 1.25x). GPT-6.2 Astra prices are for prompts under 272K tokens; every prompt here is well under that.

Model choice: `openai/gpt-6.2-astra` is the flagship of OpenAI's current GPT-6.2 series. Google's current family has no Pro or Flash names; `google/gemini-4-argon` is the one OpenRouter describes as Google's flagship reasoning model for multi-step agents. `deepseek/deepseek-v4-pro-0813` is the GA release of DeepSeek V4 Pro with open weights (`deepseek-ai/DeepSeek-V4-Pro-0813`). `moonshotai/kimi-k3.1-pro` is the latest Kimi model.

## Notes

- Prompt caching differs by provider. Claude requests set an explicit `cache_control` breakpoint (Anthropic only). OpenRouter requests send no cache option; the upstream provider caches on its own and OpenRouter reports the cached tokens and the cost. Cache prices and minimum prefix sizes differ by provider, so the same prompt can cost different amounts from one run to the next.
- Effort differs by provider. Claude runs with `effort: "low"` (Anthropic only). OpenRouter models run with their default reasoning settings, which affects latency, output tokens and cost.
- OpenRouter routes each request to one of several upstream providers, so latency for one model can vary between runs.
- Total spend for this benchmark, smoke runs included: about $2.39 on OpenRouter and about $0.45 on Anthropic.
