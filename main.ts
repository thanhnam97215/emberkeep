// Emberkeep — Last Light Defense: the make.fun best-game-01 entrypoint.
//
// This program runs on Node with only the standard library, in a container
// with no network. It takes the game and its screenshots out of this
// repository and assembles the submission bundle the grader reads:
//
//   <output>/game/         the static game files, copied as-is
//   <output>/screenshots/  the maker's screenshots of the game
//   <output>/dossier.json  the judge's summary, written by the vendored
//                          make.fun library from those same files
//
// The output directory is /output inside the grader; outside it,
// MAKEFUN_OUTPUT_DIR points somewhere local instead:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this file lives, and where the bundle goes.
const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own limits (reference/gate.json): the text cap shapes the
// dossier's bytes; the rest refuse an entry the scorer would refuse.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Copy one top-level directory of the repository into the output, creating
// the destination first so the copy lands even when the source is empty.
function copyInto(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyInto('game');
copyInto('screenshots');

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, CAPS));
