export type PlayerIndex = 0 | 1;

export type DuelStatus = "playing" | "finished";

export type DuelCommand =
  | { type: "attack" }
  | { type: "defend" }
  | { type: "heavy_attack" }
  | { type: "recover" };

export type DuelActivity =
  | {
      type: "attack";
      stage: "striking";
      currentTurn: 1;
      totalTurns: 1;
    }
  | {
      type: "defend";
      stage: "guarding";
      currentTurn: 1;
      totalTurns: 1;
    }
  | {
      type: "heavy_attack";
      stage: "charging" | "striking";
      currentTurn: 1 | 2;
      totalTurns: 2;
    }
  | {
      type: "recover";
      stage: "resting" | "regenerating";
      currentTurn: 1 | 2;
      totalTurns: 2;
    };

export type DuelPlayer = {
  index: PlayerIndex;
  hp: number;
  stamina: number;
  activity: DuelActivity | null;
};

export type SubmittedCommands = [
  DuelCommand | null,
  DuelCommand | null,
];

export type DuelState = {
  round: number;
  players: [DuelPlayer, DuelPlayer];
  submittedCommands: SubmittedCommands;
  status: DuelStatus;
  winnerIndex: PlayerIndex | null;
  log: string[];
};

export type DuelEvent = {
  message: string;
};

export type DuelEngineResult = {
  state: DuelState;
  events: DuelEvent[];
};

export type LegalCommandResult =
  | {
      canSubmitCommand: true;
      commands: DuelCommand[];
      reason: null;
    }
  | {
      canSubmitCommand: false;
      commands: [];
      reason: string;
    };