import type { DuelActivity, DuelCommand } from "./duel.types.js";

export function createActivityFromCommand(command: DuelCommand): DuelActivity {
  switch (command.type) {
    case "attack":
      return {
        type: "attack",
        stage: "striking",
        currentTurn: 1,
        totalTurns: 1,
      };

    case "defend":
      return {
        type: "defend",
        stage: "guarding",
        currentTurn: 1,
        totalTurns: 1,
      };

    case "heavy_attack":
      return {
        type: "heavy_attack",
        stage: "charging",
        currentTurn: 1,
        totalTurns: 2,
      };

    case "recover":
      return {
        type: "recover",
        stage: "resting",
        currentTurn: 1,
        totalTurns: 2,
      };
  }
}

export function canActivityAdvance(activity: DuelActivity): boolean {
  return activity.currentTurn < activity.totalTurns;
}

export function advanceActivity(activity: DuelActivity): DuelActivity {
  if (!canActivityAdvance(activity)) {
    throw new Error(
      `Cannot advance ${activity.type}: already on turn ${activity.currentTurn} of ${activity.totalTurns}.`,
    );
  }

  switch (activity.type) {
    case "attack":
      throw new Error("Attack is a 1-turn activity and cannot advance.");

    case "defend":
      throw new Error("Defend is a 1-turn activity and cannot advance.");

    case "heavy_attack":
      return {
        type: "heavy_attack",
        stage: "striking",
        currentTurn: 2,
        totalTurns: 2,
      };

    case "recover":
      return {
        type: "recover",
        stage: "regenerating",
        currentTurn: 2,
        totalTurns: 2,
      };
  }
}

export function isActivityReadyToResolve(activity: DuelActivity): boolean {
  return activity.currentTurn === activity.totalTurns;
}

export function isDamageDealingActivity(activity: DuelActivity): boolean {
  return (
    activity.type === "attack" ||
    (activity.type === "heavy_attack" && activity.currentTurn === 2)
  );
}

export function isDefenseActivity(activity: DuelActivity): boolean {
  return activity.type === "defend";
}

export function isRecoverActivity(activity: DuelActivity): boolean {
  return activity.type === "recover";
}

export function isStaminaRegeneratingActivity(activity: DuelActivity): boolean {
  return activity.type === "recover" && activity.currentTurn === 2;
}

export function getActivityLabel(activity: DuelActivity): string {
  return `${activity.type} (${activity.stage}, turn ${activity.currentTurn}/${activity.totalTurns})`;
}