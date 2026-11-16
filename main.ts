// markdown-fast — the harness entrypoint for markdown-render-speed-02.
//
// node main.ts reads every case from $MAKEFUN_INPUT_DIR/cases.json (a JSON
// array of {id, markdown}), renders each markdown on its own with parse()
// from ./parse.js, and writes $MAKEFUN_OUTPUT_DIR/html.json: the HTML strings
// as one JSON array, in the cases' order. MAKEFUN_INPUT_DIR and
// MAKEFUN_OUTPUT_DIR default to /input and /output inside the grader.
//
// The driver stays deliberately thin: one synchronous read, one linear loop
// over the cases, one serialisation. Nothing is cached between cases, so each
// case renders exactly as it would on its own.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

const inputDir = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const raw = readFileSync(join(inputDir, 'cases.json'), 'utf8');
const cases: { id: string; markdown: string }[] = JSON.parse(raw);

const html: string[] = new Array(cases.length);
for (let i = 0; i < cases.length; i++) {
  html[i] = parse(cases[i].markdown);
}

writeFileSync(join(outputDir, 'html.json'), JSON.stringify(html));