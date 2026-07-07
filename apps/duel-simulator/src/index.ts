import pc from "picocolors";

import {
  createInitialDuelState,
  getLegalCommands,
  MAX_HP,
  MAX_STAMINA,
  resolveRoundIfReady,
  submitCommand,
  type DuelCommand,
  type DuelEvent,
  type DuelPlayer,
  type DuelState,
  type PlayerIndex,
} from "@turn-based-duel-mcp-study/game-runtime";

const PLAYER_COLORS: Array<(str: string) => string> = [pc.blue, pc.magenta];

let state = createInitialDuelState();
printState(state);

while (state.status === "playing") {
  state = playRound(state);
}

function playRound(currentState: DuelState): DuelState {
  let state = currentState;

  console.log(`\n${pc.bold(pc.cyan(`── Round ${state.round} ${"─".repeat(30)}`))}`);

  for (const playerIndex of [0, 1] as const) {
    const legal = getLegalCommands(state, playerIndex);

    if (!legal.canSubmitCommand) continue;

    const result = submitCommand(state, playerIndex, pickCommand(legal.commands));
    printEvents(result.events);
    state = result.state;

    if (result.didResolveRound) {
      printState(result.state);
      return result.state;
    }
  }

  const result = resolveRoundIfReady(state);
  printEvents(result.events);
  printState(result.state);
  return result.state;
}

function pickCommand(commands: DuelCommand[]): DuelCommand {
  return commands[Math.floor(Math.random() * commands.length)];
}

function playerLabel(index: PlayerIndex): string {
  return PLAYER_COLORS[index](`Player ${index}`);
}

function colorPlayerRefs(message: string): string {
  return message
    .replace(/Player 0/g, playerLabel(0))
    .replace(/Player 1/g, playerLabel(1));
}

function colorEvent(message: string): string {
  // pc.bold is a text attribute (not color), so it wraps player colors safely.
  // For color-wrapped events, use a colored indicator prefix to avoid clobbering player colors.
  if (message.includes("submitted")) return pc.dim(colorPlayerRefs(message));
  if (message.includes("Resolving")) return pc.bold(message);
  if (message.includes("wins")) return pc.bold(colorPlayerRefs(message));
  if (message.includes("draw")) return pc.bold(pc.yellow(message));
  if (message.includes("attacks") || message.includes("damage")) {
    return `${pc.red("▸")} ${colorPlayerRefs(message)}`;
  }
  if (message.includes("recovers") || message.includes("stamina")) {
    return `${pc.green("▸")} ${colorPlayerRefs(message)}`;
  }
  if (message.includes("advances") || message.includes("starts")) {
    return `${pc.yellow("▸")} ${colorPlayerRefs(message)}`;
  }
  return colorPlayerRefs(message);
}

function printEvents(events: DuelEvent[]): void {
  for (const event of events) {
    console.log(`  ${colorEvent(event.message)}`);
  }
}

function printState(state: DuelState): void {
  console.log();
  printPlayer(state.players[0]);
  printPlayer(state.players[1]);

  if (state.status === "finished") {
    if (state.winnerIndex !== null) {
      console.log(`\n  ${pc.bold(`${playerLabel(state.winnerIndex)} wins!`)}`);
    } else {
      console.log(`\n  ${pc.bold(pc.yellow("Draw!"))}`);
    }
  }
}

function printPlayer(player: DuelPlayer): void {
  const activity = player.activity
    ? pc.dim(`${player.activity.type} (${player.activity.currentTurn}/${player.activity.totalTurns})`)
    : pc.dim("idle");

  console.log(
    `  ${playerLabel(player.index)}  HP: ${colorHp(player.hp)}  Stamina: ${colorStamina(player.stamina)}  [${activity}]`,
  );
}

function colorHp(hp: number): string {
  const pct = hp / MAX_HP;
  const label = String(hp);
  if (pct > 0.66) return pc.green(label);
  if (pct > 0.33) return pc.yellow(label);
  return pc.red(label);
}

function colorStamina(stamina: number): string {
  const pct = stamina / MAX_STAMINA;
  const label = String(stamina);
  if (pct > 0.66) return pc.cyan(label);
  if (pct > 0.33) return pc.yellow(label);
  return pc.red(label);
}
