import {
  canResolveRound as engineCanResolveRound,
  resolveRound as engineResolveRound,
  submitCommand as engineSubmitCommand,
  type DuelCommand,
  type DuelEvent,
  type DuelState,
  type PlayerIndex,
} from "@turn-based-duel-mcp-study/game-engine";

export type DuelSessionResult = {
  state: DuelState;
  events: DuelEvent[];
  didResolveRound: boolean;
};

export function submitCommand(
  state: DuelState,
  playerIndex: PlayerIndex,
  command: DuelCommand,
): DuelSessionResult {
  const submitResult = engineSubmitCommand(state, playerIndex, command);
  const events: DuelEvent[] = [...submitResult.events];

  if (!engineCanResolveRound(submitResult.state)) {
    return {
      state: submitResult.state,
      events,
      didResolveRound: false,
    };
  }

  const resolveResult = engineResolveRound(submitResult.state);
  events.push(...resolveResult.events);

  return {
    state: resolveResult.state,
    events,
    didResolveRound: true,
  };
}

function resolveRound(state: DuelState): DuelSessionResult {
  if (!engineCanResolveRound(state)) {
    throw new Error("Cannot resolve round: the round is not ready.");
  }

  const result = engineResolveRound(state);

  return {
    state: result.state,
    events: result.events,
    didResolveRound: true,
  };
}

export function resolveRoundIfReady(state: DuelState): DuelSessionResult {
  if (!engineCanResolveRound(state)) {
    return {
      state,
      events: [],
      didResolveRound: false,
    };
  }

  return resolveRound(state);
}
