import {
  createInitialDuelState,
  getLegalCommands,
  resolveRoundIfReady,
  submitCommand,
  type DuelCommand,
  type DuelEvent,
  type DuelPlayer,
  type DuelState,
} from "@turn-based-duel-mcp-study/game-runtime";

let state = createInitialDuelState();
printState(state);

while (state.status === "playing") {
  state = playRound(state);
}

function playRound(currentState: DuelState): DuelState {
  let state = currentState;

  console.log(`\n── Round ${state.round} ${"─".repeat(30)}`);

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

function printEvents(events: DuelEvent[]): void {
  for (const event of events) {
    console.log(`  ${event.message}`);
  }
}

function printState(state: DuelState): void {
  console.log();
  printPlayer(state.players[0]);
  printPlayer(state.players[1]);

  if (state.status === "finished") {
    console.log(
      `\n${state.winnerIndex !== null ? `Player ${state.winnerIndex} wins!` : "Draw!"}`,
    );
  }
}

function printPlayer(player: DuelPlayer): void {
  const activity = player.activity
    ? `${player.activity.type} (${player.activity.currentTurn}/${player.activity.totalTurns})`
    : "idle";

  console.log(
    `  Player ${player.index}  HP: ${player.hp}  Stamina: ${player.stamina}  [${activity}]`,
  );
}
