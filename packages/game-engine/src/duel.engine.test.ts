import { describe, expect, it } from "vitest";

import {
  ATTACK_DAMAGE,
  ATTACK_STAMINA_COST,
  DEFEND_STAMINA_COST,
  HEAVY_ATTACK_DAMAGE,
  HEAVY_ATTACK_STAMINA_COST,
  MAX_HP,
  MAX_STAMINA,
} from "./duel.constants.js";

import {
  createInitialDuelState,
  getLegalCommands,
  resolveRound,
  submitCommand,
} from "./duel.engine.js";

import type { DuelCommand, DuelState, PlayerIndex } from "./duel.types.js";

function submitBoth(
  state: DuelState,
  player0Command: DuelCommand,
  player1Command: DuelCommand,
): DuelState {
  const afterPlayer0 = submitCommand(state, 0, player0Command).state;
  return submitCommand(afterPlayer0, 1, player1Command).state;
}

function resolveAfterBothSubmit(
  state: DuelState,
  player0Command: DuelCommand,
  player1Command: DuelCommand,
): DuelState {
  const submittedState = submitBoth(state, player0Command, player1Command);
  return resolveRound(submittedState).state;
}

function getLegalCommandTypes(
  state: DuelState,
  playerIndex: PlayerIndex,
): DuelCommand["type"][] {
  const result = getLegalCommands(state, playerIndex);

  if (!result.canSubmitCommand) {
    return [];
  }

  return result.commands.map((command) => command.type);
}

describe("duel engine", () => {
  it("creates the initial duel state", () => {
    const state = createInitialDuelState();

    expect(state.round).toBe(1);
    expect(state.status).toBe("playing");
    expect(state.winnerIndex).toBeNull();

    expect(state.players[0]).toEqual({
      index: 0,
      hp: MAX_HP,
      stamina: MAX_STAMINA,
      activity: null,
    });

    expect(state.players[1]).toEqual({
      index: 1,
      hp: MAX_HP,
      stamina: MAX_STAMINA,
      activity: null,
    });

    expect(state.submittedCommands).toEqual([null, null]);
  });

  it("allows both free players to submit one command before resolving", () => {
    const state = createInitialDuelState();

    const afterPlayer0 = submitCommand(state, 0, { type: "attack" }).state;

    expect(afterPlayer0.submittedCommands[0]).toEqual({ type: "attack" });
    expect(afterPlayer0.submittedCommands[1]).toBeNull();

    expect(() =>
      submitCommand(afterPlayer0, 0, { type: "defend" }),
    ).toThrow("The player has already submitted a command for this round.");

    const afterPlayer1 = submitCommand(afterPlayer0, 1, {
      type: "defend",
    }).state;

    expect(afterPlayer1.submittedCommands[0]).toEqual({ type: "attack" });
    expect(afterPlayer1.submittedCommands[1]).toEqual({ type: "defend" });
  });

  it("resolves a basic attack against an undefended opponent", () => {
    const state = createInitialDuelState();

    const resolvedState = resolveAfterBothSubmit(
      state,
      { type: "attack" },
      { type: "recover" },
    );

    expect(resolvedState.players[0].stamina).toBe(
      MAX_STAMINA - ATTACK_STAMINA_COST,
    );

    expect(resolvedState.players[1].hp).toBe(MAX_HP - ATTACK_DAMAGE);
    expect(resolvedState.round).toBe(2);
    expect(resolvedState.submittedCommands).toEqual([null, null]);
    expect(resolvedState.players[0].activity).toBeNull();

    // Recover is a 2-turn activity, so it does not regenerate stamina immediately.
    expect(resolvedState.players[1].activity).toEqual({
      type: "recover",
      stage: "resting",
      currentTurn: 1,
      totalTurns: 2,
    });
  });

  it("blocks 100% of basic attack damage with defend", () => {
    const state = createInitialDuelState();

    const resolvedState = resolveAfterBothSubmit(
      state,
      { type: "attack" },
      { type: "defend" },
    );

    expect(resolvedState.players[0].stamina).toBe(
      MAX_STAMINA - ATTACK_STAMINA_COST,
    );

    expect(resolvedState.players[1].stamina).toBe(
      MAX_STAMINA - DEFEND_STAMINA_COST,
    );

    expect(resolvedState.players[1].hp).toBe(MAX_HP);
    expect(resolvedState.players[0].activity).toBeNull();
    expect(resolvedState.players[1].activity).toBeNull();
  });

  it("keeps heavy attack delayed for one round before it hits", () => {
  const state = createInitialDuelState();

  const round1 = resolveAfterBothSubmit(
    state,
    { type: "heavy_attack" },
    { type: "recover" },
  );

  expect(round1.players[0].stamina).toBe(
    MAX_STAMINA - HEAVY_ATTACK_STAMINA_COST,
  );

  expect(round1.players[0].activity).toEqual({
    type: "heavy_attack",
    stage: "charging",
    currentTurn: 1,
    totalTurns: 2,
  });

  expect(round1.players[1].activity).toEqual({
    type: "recover",
    stage: "resting",
    currentTurn: 1,
    totalTurns: 2,
  });

  expect(round1.players[1].hp).toBe(MAX_HP);

  // Both players are busy, so nobody submits a command for round 2.
  const round2 = resolveRound(round1).state;

  expect(round2.players[0].activity).toBeNull();
  expect(round2.players[1].activity).toBeNull();
  expect(round2.players[1].hp).toBe(MAX_HP - HEAVY_ATTACK_DAMAGE);
});

  it("lets defend block a heavy attack if timed on the hit round", () => {
  const state = createInitialDuelState();

  const round1 = resolveAfterBothSubmit(
    state,
    { type: "heavy_attack" },
    { type: "attack" },
  );

  expect(round1.players[0].activity).toEqual({
    type: "heavy_attack",
    stage: "charging",
    currentTurn: 1,
    totalTurns: 2,
  });

  expect(round1.players[1].activity).toBeNull();

  // Player 0 is busy charging, but Player 1 is free and can defend.
  const round2Submitted = submitCommand(round1, 1, { type: "defend" }).state;
  const round2 = resolveRound(round2Submitted).state;

  expect(round2.players[1].hp).toBe(MAX_HP);

  expect(round2.players[1].stamina).toBe(
    MAX_STAMINA - ATTACK_STAMINA_COST - DEFEND_STAMINA_COST,
  );

  expect(round2.players[0].activity).toBeNull();
  expect(round2.players[1].activity).toBeNull();
});

  it("regenerates stamina only on the second turn of recover", () => {
    const state = createInitialDuelState();

    const afterRound1 = resolveAfterBothSubmit(
      state,
      { type: "attack" },
      { type: "recover" },
    );

    expect(afterRound1.players[1].stamina).toBe(MAX_STAMINA);

    const afterRound2Submitted = submitCommand(afterRound1, 0, {
      type: "attack",
    }).state;

    const afterRound2 = resolveRound(afterRound2Submitted).state;

    expect(afterRound2.players[1].activity).toBeNull();
    expect(afterRound2.players[1].stamina).toBe(MAX_STAMINA);
  });

  it("makes basic attack spam eventually force recovery", () => {
    let state = createInitialDuelState();

    state = resolveAfterBothSubmit(
      state,
      { type: "attack" },
      { type: "recover" },
    );

    state = submitCommand(state, 0, { type: "attack" }).state;
    state = resolveRound(state).state;

    state = resolveAfterBothSubmit(
      state,
      { type: "attack" },
      { type: "recover" },
    );

    state = submitCommand(state, 0, { type: "attack" }).state;
    state = resolveRound(state).state;

    expect(state.players[0].stamina).toBe(3);

    const legalCommandTypes = getLegalCommandTypes(state, 0);

    expect(legalCommandTypes).toEqual(["recover"]);
  });

  it("can end the duel in a draw when both players deal lethal damage simultaneously", () => {
    let state = createInitialDuelState();

    state.players[0].hp = ATTACK_DAMAGE;
    state.players[1].hp = ATTACK_DAMAGE;

    const resolvedState = resolveAfterBothSubmit(
      state,
      { type: "attack" },
      { type: "attack" },
    );

    expect(resolvedState.status).toBe("finished");
    expect(resolvedState.winnerIndex).toBeNull();
    expect(resolvedState.players[0].hp).toBe(0);
    expect(resolvedState.players[1].hp).toBe(0);
  });
});
