export {
  resolveRoundIfReady,
  submitCommand,
} from "./duel-session.js";

export type { DuelSessionResult } from "./duel-session.js";

export {
  canResolveRound,
  createInitialDuelState,
  getLegalCommands,
  MAX_HP,
  MAX_STAMINA,
} from "@turn-based-duel-mcp-study/game-engine";

export type {
  DuelCommand,
  DuelEvent,
  DuelPlayer,
  DuelState,
  DuelStatus,
  LegalCommandResult,
  PlayerIndex,
} from "@turn-based-duel-mcp-study/game-engine";
