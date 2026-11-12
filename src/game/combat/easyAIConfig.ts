export interface EasyAIConfig {
  /** Distance to maintain when engaging (metres) */
  engagement: {
    min: number;
    max: number;
    desired: number;
  };
  /** Minimum spacing between allied tanks (metres) */
  spacing: {
    separationDistance: number;
    repulsionStrength: number;
  };
  /** Stuck detection and recovery */
  stuck: {
    detectTime: number;
    speedThreshold: number;
    reverseTime: number;
    turnTime: number;
    reverseThrottle: number;
  };
  /** Movement, zigzag and repositioning */
  movement: {
    zigzagInterval: number;
    zigzagAmplitude: number;
    stopToShootDuration: number;
    repositionDuration: number;
    cautiousSpeed: number;
  };
  /** Retreat / cover when damaged */
  damageReaction: {
    duration: number;
    reverseThrottle: number;
    turnAngle: number;
  };
  /** Fairness and accuracy */
  fairness: {
    reactionDelay: number;
    ambushGracePeriod: number;
    reloadTime: number;
    aimDispersion: {
      base: number;
      distanceFactor: number;
      speedFactor: number;
    };
  };
}

export const EASY_AI_CONFIG: EasyAIConfig = {
  engagement: {
    min: 28,
    max: 52,
    desired: 40,
  },
  spacing: {
    separationDistance: 14,
    repulsionStrength: 1.2,
  },
  stuck: {
    detectTime: 1.2,
    speedThreshold: 0.25,
    reverseTime: 1.4,
    turnTime: 0.9,
    reverseThrottle: -0.6,
  },
  movement: {
    zigzagInterval: 2.4,
    zigzagAmplitude: 0.35,
    stopToShootDuration: 1.5,
    repositionDuration: 3.2,
    cautiousSpeed: 4.5,
  },
  damageReaction: {
    duration: 2.0,
    reverseThrottle: -0.65,
    turnAngle: 0.5,
  },
  fairness: {
    reactionDelay: 0.85,
    ambushGracePeriod: 2.0,
    reloadTime: 4.5,
    aimDispersion: {
      base: 0.4,
      distanceFactor: 0.02,
      speedFactor: 0.12,
    },
  },
};
