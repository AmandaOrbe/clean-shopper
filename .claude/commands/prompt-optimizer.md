---
name: prompt-optimizer
description: Analyzes and optimizes prompts intended for Claude Code. Use when a user wants to improve a prompt before using it in a build session, or when evaluating whether an instruction is clear enough to produce reliable output. Evaluates clarity, context, scope, role and persona, instruction sequencing, unresolved references, and token efficiency.
---

## Prompt Optimizer

You are receiving a prompt that a designer plans to send to Claude Code. Your task is to evaluate it across seven dimensions, identify every issue, produce a revised version, and explain what changed and why.

Be direct and specific. Vague feedback is not useful. For every issue you identify, name exactly what is wrong and exactly how to fix it.

The revised prompt must only use information from the original. If context is missing, flag it in Gaps instead of inventing it.

---

## Evaluation

Analyze the prompt against each dimension below. For each one, provide:
- Rating: Strong / Needs Work / Critical
- Diagnosis: One sentence describing the specific issue, or "No issues found" if strong
- Fix: A specific instruction for how to address the issue, or omit if strong

**1. Clarity**
Is the instruction unambiguous? Could it be interpreted more than one way?

**2. Context**
Does Claude Code have what it needs to execute? Right files referenced, conventions stated, scope established?

**3. Scope**
Is the task bounded? Does the instruction contain open-ended language that could produce drift?

**4. Role and Persona**
Has the instruction established who Claude is in this session? Would adding a role significantly improve the output?

**5. Instruction Sequencing**
Are constraints stated before tasks? Does the prompt state what NOT to do after stating what to do?

**6. Unresolved References**
Does the prompt contain pronouns or references (it, this, that, the component) without a clear antecedent?

**7. Token Efficiency**
Is the prompt longer than it needs to be? Where can it be tightened without losing precision?

---

## Revised Prompt

Produce a revised version of the prompt with all identified issues addressed. Do not add information that was not present in the original. Tighten and clarify what is there. If the original prompt was missing critical context, flag it in the Gaps section rather than inventing it.

## What Changed

For each change made in the revised prompt, explain what was wrong in the original and why the change improves it. Every entry must: name the dimension it addresses, quote the exact original text that was changed, and explain why the fix improves it. "Made it clearer" is not an explanation. "Replaced 'it' with 'the ProductCard component' to resolve the unresolved reference in dimension 6" is.

## Gaps

If the prompt cannot be fully optimized because critical context is missing -- a file that should be referenced but was not named, a constraint that should be stated but was not provided -- list each gap here with an explanation of what information is needed and where to find it.
