import {
  ATTACK_DAMAGE,
  ATTACK_STAMINA_COST,
  DEFEND_DAMAGE_MULTIPLIER,
  DEFEND_STAMINA_COST,
  HEAVY_ATTACK_DAMAGE,
  HEAVY_ATTACK_STAMINA_COST,
  MAX_HP,
  MAX_STAMINA,
  RECOVER_STAMINA_GAIN,
} from "./duel.constants.js";

import {
  advanceActivity,
  createActivityFromCommand,
  isDamageDealingActivity,
  isDefenseActivity,
  isStaminaRegeneratingActivity,
} from "./duel.activity.js";

import type {
  DuelActivity,
  DuelCommand,
  DuelEngineResult,
  DuelEvent,
  DuelPlayer,
  DuelState,
  LegalCommandResult,
  PlayerIndex,
  SubmittedCommands,
} from "./duel.types.js";

export function createInitialDuelState(): DuelState {
  return {
    round: 1,
    players: [
      {
        index: 0,
        hp: MAX_HP,
        stamina: MAX_STAMINA,
        activity: null,
      },
      {
        index: 1,
        hp: MAX_HP,
        stamina: MAX_STAMINA,
        activity: null,
      },
    ],
    submittedCommands: [null, null],
    status: "playing",
    winnerIndex: null,
    log: [],
  };
}

export function getOpponentIndex(playerIndex: PlayerIndex): PlayerIndex {
  return playerIndex === 0 ? 1 : 0;
}

export function getPlayer(
  state: DuelState,
  playerIndex: PlayerIndex,
): DuelPlayer {
  return state.players[playerIndex];
}

export function getOpponent(
  state: DuelState,
  playerIndex: PlayerIndex,
): DuelPlayer {
  return state.players[getOpponentIndex(playerIndex)];
}

export function canPlayerReceiveCommand(
  state: DuelState,
  playerIndex: PlayerIndex,
): boolean {
  const player = getPlayer(state, playerIndex);

  return (
    state.status === "playing" &&
    player.activity === null &&
    state.submittedCommands[playerIndex] === null
  );
}

export function getLegalCommands(
  state: DuelState,
  playerIndex: PlayerIndex,
): LegalCommandResult {
  if (state.status === "finished") {
    return {
      canSubmitCommand: false,
      commands: [],
      reason: "The duel is already finished.",
    };
  }

  const player = getPlayer(state, playerIndex);
  const submittedCommand = state.submittedCommands[playerIndex];

  if (player.activity !== null && submittedCommand !== null) {
    throw new Error(
      `Invalid duel state: Player ${playerIndex} has both an activity and a submitted command.`,
    );
  }

  if (player.activity !== null) {
    return {
      canSubmitCommand: false,
      commands: [],
      reason: "The player is already busy with an activity.",
    };
  }

  if (submittedCommand !== null) {
    return {
      canSubmitCommand: false,
      commands: [],
      reason: "The player has already submitted a command for this round.",
    };
  }

  const commands: DuelCommand[] = [];

  if (player.stamina >= ATTACK_STAMINA_COST) {
    commands.push({ type: "attack" });
  }

  if (player.stamina >= DEFEND_STAMINA_COST) {
    commands.push({ type: "defend" });
  }

  if (player.stamina >= HEAVY_ATTACK_STAMINA_COST) {
    commands.push({ type: "heavy_attack" });
  }

  commands.push({ type: "recover" });

  return {
    canSubmitCommand: true,
    commands,
    reason: null,
  };
}

export function submitCommand(
  state: DuelState,
  playerIndex: PlayerIndex,
  command: DuelCommand,
): DuelEngineResult {
  const legalCommands = getLegalCommands(state, playerIndex);

  if (!legalCommands.canSubmitCommand) {
    throw new Error(legalCommands.reason);
  }

  const isLegalCommand = legalCommands.commands.some(
    (legalCommand) => legalCommand.type === command.type,
  );

  if (!isLegalCommand) {
    throw new Error(
      `Player ${playerIndex} cannot submit command "${command.type}".`,
    );
  }

  const nextState = cloneDuelState(state);
  const events: DuelEvent[] = [
    {
      message: `Player ${playerIndex} submitted ${command.type}.`,
    },
  ];

  nextState.submittedCommands[playerIndex] = command;
  appendEvents(nextState, events);

  return {
    state: nextState,
    events,
  };
}

export function canResolveRound(state: DuelState): boolean {
  if (state.status === "finished") {
    return false;
  }

  return state.players.every((player) => {
    const submittedCommand = state.submittedCommands[player.index];

    if (player.activity !== null && submittedCommand !== null) {
      throw new Error(
        `Invalid duel state: Player ${player.index} has both an activity and a submitted command.`,
      );
    }

    if (player.activity !== null) {
      return true;
    }

    return submittedCommand !== null;
  });
}

export function resolveRound(state: DuelState): DuelEngineResult {
  if (state.status === "finished") {
    throw new Error("Cannot resolve round: the duel is already finished.");
  }

  if (!canResolveRound(state)) {
    throw new Error(
      "Cannot resolve round: every free player must submit a command first.",
    );
  }

  const nextState = cloneDuelState(state);
  const events: DuelEvent[] = [
    {
      message: `Resolving round ${nextState.round}.`,
    },
  ];

  advanceOngoingActivities(nextState, events);
  startSubmittedCommands(nextState, events);
  resolveRecoveryEffects(nextState, events);
  resolveAttackEffects(nextState, events);
  clearResolvedActivities(nextState);
  resetSubmittedCommands(nextState);
  resolveWinner(nextState, events);

  if (nextState.status === "playing") {
    nextState.round += 1;
  }

  appendEvents(nextState, events);

  return {
    state: nextState,
    events,
  };
}

function advanceOngoingActivities(
  state: DuelState,
  events: DuelEvent[],
): void {
  for (const player of state.players) {
    const activity = player.activity;

    if (activity === null) {
      continue;
    }

    if (activity.currentTurn >= activity.totalTurns) {
      continue;
    }

    player.activity = advanceActivity(activity);

    events.push({
      message: `Player ${player.index} advances ${activity.type}.`,
    });
  }
}

function startSubmittedCommands(
  state: DuelState,
  events: DuelEvent[],
): void {
  for (const player of state.players) {
    if (player.activity !== null) {
      continue;
    }

    const submittedCommand = state.submittedCommands[player.index];

    if (submittedCommand === null) {
      throw new Error(`Player ${player.index} has no submitted command.`);
    }

    spendStaminaForCommand(player, submittedCommand);

    player.activity = createActivityFromCommand(submittedCommand);

    events.push({
      message: `Player ${player.index} starts ${submittedCommand.type}.`,
    });
  }
}

function resolveRecoveryEffects(
  state: DuelState,
  events: DuelEvent[],
): void {
  for (const player of state.players) {
    const activity = player.activity;

    if (activity === null) {
      continue;
    }

    if (!isStaminaRegeneratingActivity(activity)) {
      continue;
    }

    const previousStamina = player.stamina;

    player.stamina = Math.min(
      MAX_STAMINA,
      player.stamina + RECOVER_STAMINA_GAIN,
    );

    const recoveredStamina = player.stamina - previousStamina;

    events.push({
      message: `Player ${player.index} recovers ${recoveredStamina} stamina.`,
    });
  }
}

function resolveAttackEffects(
  state: DuelState,
  events: DuelEvent[],
): void {
  const pendingDamages: [number, number] = [0, 0];

  for (const attacker of state.players) {
    const activity = attacker.activity;

    if (activity === null) {
      continue;
    }

    if (!isDamageDealingActivity(activity)) {
      continue;
    }

    const defenderIndex = getOpponentIndex(attacker.index);
    const defender = state.players[defenderIndex];

    const rawDamage = getDamageForActivity(activity);
    const finalDamage = getFinalDamageAgainstDefender(rawDamage, defender);

    pendingDamages[defenderIndex] += finalDamage;

    events.push({
      message: `Player ${attacker.index} attacks Player ${defenderIndex} for ${finalDamage} damage.`,
    });
  }

  for (const player of state.players) {
    const damage = pendingDamages[player.index];

    if (damage <= 0) {
      continue;
    }

    player.hp = Math.max(0, player.hp - damage);

    events.push({
      message: `Player ${player.index} has ${player.hp} HP remaining.`,
    });
  }
}

function clearResolvedActivities(state: DuelState): void {
  for (const player of state.players) {
    const activity = player.activity;

    if (activity === null) {
      continue;
    }

    if (activity.currentTurn === activity.totalTurns) {
      player.activity = null;
    }
  }
}

function resetSubmittedCommands(state: DuelState): void {
  state.submittedCommands = [null, null];
}

function resolveWinner(
  state: DuelState,
  events: DuelEvent[],
): void {
  const player0 = state.players[0];
  const player1 = state.players[1];

  if (player0.hp > 0 && player1.hp > 0) {
    return;
  }

  state.status = "finished";

  if (player0.hp <= 0 && player1.hp <= 0) {
    state.winnerIndex = null;

    events.push({
      message: "The duel ends in a draw.",
    });

    return;
  }

  state.winnerIndex = player0.hp > 0 ? 0 : 1;

  events.push({
    message: `Player ${state.winnerIndex} wins the duel.`,
  });
}

function spendStaminaForCommand(
  player: DuelPlayer,
  command: DuelCommand,
): void {
  const cost = getStaminaCostForCommand(command);

  if (player.stamina < cost) {
    throw new Error(
      `Player ${player.index} does not have enough stamina for ${command.type}.`,
    );
  }

  player.stamina -= cost;
}

function getStaminaCostForCommand(command: DuelCommand): number {
  switch (command.type) {
    case "attack":
      return ATTACK_STAMINA_COST;

    case "defend":
      return DEFEND_STAMINA_COST;

    case "heavy_attack":
      return HEAVY_ATTACK_STAMINA_COST;

    case "recover":
      return 0;
  }
}

function getDamageForActivity(activity: DuelActivity): number {
  switch (activity.type) {
    case "attack":
      return ATTACK_DAMAGE;

    case "heavy_attack":
      return HEAVY_ATTACK_DAMAGE;

    case "defend":
    case "recover":
      return 0;
  }
}

function getFinalDamageAgainstDefender(
  rawDamage: number,
  defender: DuelPlayer,
): number {
  if (defender.activity !== null && isDefenseActivity(defender.activity)) {
    return Math.floor(rawDamage * DEFEND_DAMAGE_MULTIPLIER);
  }

  return rawDamage;
}

function appendEvents(
  state: DuelState,
  events: DuelEvent[],
): void {
  state.log.push(...events.map((event) => event.message));
}

function cloneDuelState(state: DuelState): DuelState {
  return {
    round: state.round,
    players: [
      clonePlayer(state.players[0]),
      clonePlayer(state.players[1]),
    ],
    submittedCommands: cloneSubmittedCommands(state.submittedCommands),
    status: state.status,
    winnerIndex: state.winnerIndex,
    log: [...state.log],
  };
}

function clonePlayer(player: DuelPlayer): DuelPlayer {
  return {
    index: player.index,
    hp: player.hp,
    stamina: player.stamina,
    activity: cloneActivity(player.activity),
  };
}

function cloneActivity(activity: DuelActivity | null): DuelActivity | null {
  if (activity === null) {
    return null;
  }

  return { ...activity };
}

function cloneSubmittedCommands(
  submittedCommands: SubmittedCommands,
): SubmittedCommands {
  return [
    cloneCommand(submittedCommands[0]),
    cloneCommand(submittedCommands[1]),
  ];
}

function cloneCommand(command: DuelCommand | null): DuelCommand | null {
  if (command === null) {
    return null;
  }

  return { ...command };
}