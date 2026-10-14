/* Airborne Puma -- every number the game is tuned by. DOM-free.
 *
 * Distances are in tiles (16 pixels), times in ticks: 50 a second, the C64's
 * PAL frame rate. The game-speed setting changes how many ticks run in a real
 * second and nothing else, so a mission plays the same at any speed.
 *
 * The 1987 manual gives few numbers. Every value marked UNCERTAIN is a guess
 * made to feel right, not a measurement of the original. */
"use strict";
AP.C = {
  HZ: 50,
  W: 40, H: 200,                       /* the strip, in tiles. UNCERTAIN */
  CLOCK_S: 600,                        /* seconds on the clock. UNCERTAIN: C64-Wiki's figure */

  /* the ranger */
  WALK: 0.045, RUN: 0.08, CRAWL: 0.02,
  R: 0.3,                              /* body radius, for walls */
  FAT: { run: 0.3, walk: 0.1, crawl: 0.12, still: 0.25, desert: 1.5, wound: 0.3, burden: 0.25, rest: 30 },
  BREATH: 400, DROWN: 250,             /* ticks under water before it hurts, and between wounds after */
  THIN_T: 100,                         /* ticks standing on thin ice before it goes */
  KD: 30,                              /* knocked down when the body armour stops a round */
  AID_T: 100,
  CARBINE: { rate: 5, reload: 50, range: 12, mag: 30, spread: 0.05 },
  GREN: { min: 2, max: 8, charge: 50, flight: 26, r: 1.6 },
  LAW: { speed: 0.45, range: 16, r: 1.4 },
  BOMB: { r: 2.6, sabotage: 30 },      /* seconds a bomb at the aviation fuel is set for: "midnight". UNCERTAIN */
  KNIFE: 1.3,
  NOISE: { run: 3, walk: 1.2, carbine: 14, boom: 20, arctic: 0.7 },

  /* the enemy. Sight stays inside the screen: nobody shoots from where he cannot be seen */
  REACT: 30,                           /* ticks from being spotted to the first shot, at least */
  SIGHT: 7, FOV: 11,                     /* tiles; half-angle in 32nds of a turn (11 is about 124 degrees) */
  SEEN_FULL: 100,                      /* ticks in someone's sight before the whole area is on alert */
  QUIET2: 3000, QUIET1: 1500,          /* ticks without contact before the alert stands down a level */
  PURSUERS: 8,
  REINF_MAX: 6,

  /* the Osprey */
  INBOUND: 1000, REAGAIN: 1500, CLIMB: 60,
  DROP: { speed: 0.12, ff: 4, chute: 100, fall: 0.4, spill: 0.25, pod: 0.6 },

  /* by difficulty, 0 (easiest) to 3 */
  DIFF: {
    name: ["Recruit", "Regular", "Veteran", "Elite"],
    enemies: [0.6, 0.8, 1, 1.25], acc: [0.6, 0.8, 1, 1.2], gren: [0, 1, 1, 1],
    launchers: [1, 2, 3, 4], minib: [0, 1, 2, 3], planes: [2, 3, 3, 4], dishes: [2, 3, 3, 4],
    reinf: [0, 60, 40, 25], armor: [0.5, 0.4, 0.3, 0.2], merit: [0.5, 0.75, 1, 1.25],
    wait: [60, 45, 30, 20], div: [30, 45, 60, 80],
  },

  START: { mag: 4, gren: 3, law: 1, bomb: 1, aid: 1 },
  CAPS: { mag: 8, gren: 6, law: 2, bomb: 2, aid: 2 },   /* Field pod handling only */
  POD_ITEMS: ["mag", "gren", "law", "bomb", "aid"],
  WEAPONS: ["carbine", "gren", "law", "knife", "bomb", "aid"],

  /* merit points, before the difficulty multiplier. UNCERTAIN throughout */
  MERIT: { rifle: 5, guard: 5, sniper: 6, elite: 8, at: 8, flamer: 8, officer: 15, tank: 25,
    mg: 10, minib: 10, bunker: 20, turret: 20, plane: 30, sam: 30, dish: 30, shack: 20, magazine: 20, fuel: 20,
    pump: 40, avfuel: 40, pyramid: 10, door: 5, tent: 5, guardhouse: 10, prox: 2,
    stealth: 50, wound: -10, lostFriend: -50 },

  RANKS: [
    ["PFC", "Private First Class", 0], ["CPL", "Corporal", 100], ["SGT", "Sergeant", 250],
    ["SSG", "Staff Sergeant", 450], ["PSG", "Platoon Sergeant", 700], ["SGM", "Sergeant Major", 1000],
    ["2LT", "Second Lieutenant", 1400], ["1LT", "First Lieutenant", 1900], ["CPT", "Captain", 2500],
    ["MAJ", "Major", 3200], ["LTC", "Lieutenant Colonel", 4000], ["COL", "Colonel", Infinity],
  ],
  /* awarded for one mission's merit, goal met; the highest not yet held */
  AWARDS: [
    ["COM1", "Army Commendation Medal", 150], ["COM2", "Army Commendation Medal, second award", 250],
    ["BSTR", "Bronze Star", 350], ["SSTR", "Silver Star", 500], ["DSC", "Distinguished Service Cross", 700],
    ["CMOH", "Medal of Honor", Infinity],
  ],
};

/* Who the enemy are. sight and range in tiles, acc a hit's chance per round
 * at point blank, rate ticks between bursts. */
AP.KINDS = {
  rifle:   { hp: 1, sight: 7, range: 6, acc: 0.13, rate: 100, burst: 3, gren: true },
  guard:   { hp: 1, sight: 7, range: 6, acc: 0.13, rate: 100, burst: 3, gren: true, post: true },
  sniper:  { hp: 1, sight: 9, range: 8, acc: 0.2, rate: 120, burst: 1, post: true, prone: true },
  elite:   { hp: 2, sight: 8, range: 7, acc: 0.18, rate: 80, burst: 3, gren: true },
  at:      { hp: 1, sight: 7, range: 8, acc: 0.5, rate: 200, burst: 1, rocket: true },
  flamer:  { hp: 1, sight: 7, range: 3, acc: 0.5, rate: 90, burst: 1, flame: true },
  officer: { hp: 1, sight: 7, range: 5, acc: 0.08, rate: 100, burst: 1, post: true },
  tank:    { hp: 1, sight: 7, range: 7, acc: 0.5, rate: 170, burst: 1, rocket: true, armor: "hard", fov: 16 },
  hostage: { friend: true },
  pow:     { friend: true },
};
