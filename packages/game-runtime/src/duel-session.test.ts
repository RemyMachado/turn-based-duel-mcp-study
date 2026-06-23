import { describe, expect, it } from "vitest";

import { createInitialDuelState } from "@turn-based-duel-mcp-study/game-engine";

import { resolveRoundIfReady, submitCommand } from "./duel-session.js";

describe("game runtime", () => {
  describe("submitCommand", () => {
    it("does not auto-resolve after only one player submits", () => {
      const state = createInitialDuelState();
      const result = submitCommand(state, 0, { type: "attack" });

      expect(result.didResolveRound).toBe(false);
      expect(result.state.round).toBe(1);
    });

    it("returns the submit event when not auto-resolving", () => {
      const state = createInitialDuelState();
      const result = submitCommand(state, 0, { type: "attack" });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].message).toContain("Player 0 submitted attack");
    });

    it("auto-resolves when the second player submits", () => {
      const state = createInitialDuelState();
      const afterP0 = submitCommand(state, 0, { type: "attack" }).state;
      const result = submitCommand(afterP0, 1, { type: "defend" });

      expect(result.didResolveRound).toBe(true);
      expect(result.state.round).toBe(2);
    });

    it("includes all submit and resolve events when auto-resolving", () => {
      const state = createInitialDuelState();
      const afterP0 = submitCommand(state, 0, { type: "attack" }).state;
      const result = submitCommand(afterP0, 1, { type: "defend" });

      const messages = result.events.map((e) => e.message);

      expect(messages.some((m) => m.includes("Player 1 submitted defend"))).toBe(true);
      expect(messages.some((m) => m.includes("Resolving round 1"))).toBe(true);
    });

    it("auto-resolves when player submits and opponent has an ongoing activity", () => {
      const state = createInitialDuelState();

      // Round 1: player 0 attacks, player 1 recovers (2-turn activity).
      // After resolution player 0 has no activity, player 1 is in recover (1/2).
      const afterRound1 = submitCommand(
        submitCommand(state, 0, { type: "attack" }).state,
        1,
        { type: "recover" },
      ).state;

      expect(afterRound1.players[0].activity).toBeNull();
      expect(afterRound1.players[1].activity?.type).toBe("recover");

      // Round 2: player 1 still has an activity, so player 0 submitting should immediately resolve.
      const result = submitCommand(afterRound1, 0, { type: "attack" });

      expect(result.didResolveRound).toBe(true);
      expect(result.state.round).toBe(3);
    });
  });

  describe("resolveRoundIfReady", () => {
    it("returns didResolveRound: false with empty events when round is not ready", () => {
      const state = createInitialDuelState();
      const afterP0 = submitCommand(state, 0, { type: "attack" }).state;
      const result = resolveRoundIfReady(afterP0);

      expect(result.didResolveRound).toBe(false);
      expect(result.events).toHaveLength(0);
      expect(result.state).toEqual(afterP0);
    });

    it("resolves when both players have ongoing activities", () => {
      const state = createInitialDuelState();

      // Round 1: heavy_attack (2-turn) and recover (2-turn).
      // After resolution both players are in turn 1/2 of their activities.
      const afterRound1 = submitCommand(
        submitCommand(state, 0, { type: "heavy_attack" }).state,
        1,
        { type: "recover" },
      ).state;

      expect(afterRound1.players[0].activity?.type).toBe("heavy_attack");
      expect(afterRound1.players[1].activity?.type).toBe("recover");

      const result = resolveRoundIfReady(afterRound1);

      expect(result.didResolveRound).toBe(true);
      expect(result.state.round).toBe(3);
    });
  });
});
