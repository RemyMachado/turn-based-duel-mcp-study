export {
  canPlayerReceiveCommand,
  canResolveRound,
  createInitialDuelState,
  getLegalCommands,
  resolveRound,
  submitCommand,
} from "./duel.engine.js";

export {
  ATTACK_DAMAGE,
  ATTACK_STAMINA_COST,
  DEFEND_STAMINA_COST,
  HEAVY_ATTACK_DAMAGE,
  HEAVY_ATTACK_STAMINA_COST,
  MAX_HP,
  MAX_STAMINA,
  RECOVER_STAMINA_GAIN,
} from "./duel.constants.js";

export type {
  DuelCommand,
  DuelEngineResult,
  DuelEvent,
  DuelPlayer,
  DuelState,
  DuelStatus,
  LegalCommandResult,
  PlayerIndex,
} from "./duel.types.js";