/**
 * `levels[level - 1][attempt]`: the lit tiles (row by row) of each try at a level, played from
 * `start_level` (absent in challenges from before practice settings: 1).
 */
export type PatternMemoryChallenge = { start_level?: number; levels: number[][][] };

export type PatternMemorySettings = { start_level: number };

export type PatternMemoryEvent = { t_ms: number; level: number; attempt: number; tile: number };

export type PatternMemoryScore = { level: number; lives_left: number };
