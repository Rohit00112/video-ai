import { SceneScript, StoryConcept } from '../../services/scripting/schema.js';
import { WATER_SYSTEMS_CONCEPT, WATER_SYSTEMS_SCENES } from './waterSystemsStory.js';
import { BAMBOO_ROOTS_CONCEPT, BAMBOO_ROOTS_SCENES } from './bambooRootsStory.js';
import { HARBOR_MAP_CONCEPT, HARBOR_MAP_SCENES } from './harborMapStory.js';
import { ZERO_RULES_TOWN_CONCEPT, ZERO_RULES_TOWN_SCENES } from './zeroRulesTownStory.js';
import { FREE_MONEY_ISLAND_CONCEPT, FREE_MONEY_ISLAND_SCENES } from './freeMoneyIslandStory.js';
import { MARS_RESUME_CONCEPT, MARS_RESUME_SCENES } from './marsResumeStory.js';
import { DINO_TIME_CONCEPT, DINO_TIME_SCENES } from './dinoTimeStory.js';
import { GRAVITY_SWITCH_CONCEPT, GRAVITY_SWITCH_SCENES } from './gravitySwitchStory.js';
import { DREAM_TAX_CONCEPT, DREAM_TAX_SCENES } from './dreamTaxStory.js';
import { PIZZA_MONEY_CONCEPT, PIZZA_MONEY_SCENES } from './pizzaMoneyStory.js';
import { INFINITE_IQ_CONCEPT, INFINITE_IQ_SCENES } from './infiniteIqStory.js';
import { PENNY_DOUBLE_CONCEPT, PENNY_DOUBLE_SCENES } from './pennyDoubleStory.js';
import { FIVE_HUNDRED_IQ_CONCEPT, FIVE_HUNDRED_IQ_SCENES } from './fiveHundredIqStory.js';
import { EVERYONE_GONE_CONCEPT, EVERYONE_GONE_SCENES } from './everyoneGoneStory.js';
import { FREEZE_TIME_CONCEPT, FREEZE_TIME_SCENES } from './freezeTimeStory.js';
import { FIVE_HUNDRED_IQ_PUPPET_CONCEPT, FIVE_HUNDRED_IQ_PUPPET_SCENES } from './fiveHundredIqPuppetStory.js';
import { PRISON_IQ_CONCEPT, PRISON_IQ_SCENES } from './prisonIqStory.js';
import { EVERYONE_INVISIBLE_CONCEPT, EVERYONE_INVISIBLE_SCENES } from './everyoneInvisibleStory.js';

export interface RegisteredStory {
  id: string;
  concept: StoryConcept;
  scenes: SceneScript[];
}

export const STORY_REGISTRY: Record<string, RegisteredStory> = {
  [WATER_SYSTEMS_CONCEPT.id]: {
    id: WATER_SYSTEMS_CONCEPT.id,
    concept: WATER_SYSTEMS_CONCEPT,
    scenes: WATER_SYSTEMS_SCENES,
  },
  [BAMBOO_ROOTS_CONCEPT.id]: {
    id: BAMBOO_ROOTS_CONCEPT.id,
    concept: BAMBOO_ROOTS_CONCEPT,
    scenes: BAMBOO_ROOTS_SCENES,
  },
  [HARBOR_MAP_CONCEPT.id]: {
    id: HARBOR_MAP_CONCEPT.id,
    concept: HARBOR_MAP_CONCEPT,
    scenes: HARBOR_MAP_SCENES,
  },
  [ZERO_RULES_TOWN_CONCEPT.id]: {
    id: ZERO_RULES_TOWN_CONCEPT.id,
    concept: ZERO_RULES_TOWN_CONCEPT,
    scenes: ZERO_RULES_TOWN_SCENES,
  },
  [FREE_MONEY_ISLAND_CONCEPT.id]: {
    id: FREE_MONEY_ISLAND_CONCEPT.id,
    concept: FREE_MONEY_ISLAND_CONCEPT,
    scenes: FREE_MONEY_ISLAND_SCENES,
  },
  [MARS_RESUME_CONCEPT.id]: {
    id: MARS_RESUME_CONCEPT.id,
    concept: MARS_RESUME_CONCEPT,
    scenes: MARS_RESUME_SCENES,
  },
  [DINO_TIME_CONCEPT.id]: {
    id: DINO_TIME_CONCEPT.id,
    concept: DINO_TIME_CONCEPT,
    scenes: DINO_TIME_SCENES,
  },
  [GRAVITY_SWITCH_CONCEPT.id]: {
    id: GRAVITY_SWITCH_CONCEPT.id,
    concept: GRAVITY_SWITCH_CONCEPT,
    scenes: GRAVITY_SWITCH_SCENES,
  },
  [DREAM_TAX_CONCEPT.id]: {
    id: DREAM_TAX_CONCEPT.id,
    concept: DREAM_TAX_CONCEPT,
    scenes: DREAM_TAX_SCENES,
  },
  [PIZZA_MONEY_CONCEPT.id]: {
    id: PIZZA_MONEY_CONCEPT.id,
    concept: PIZZA_MONEY_CONCEPT,
    scenes: PIZZA_MONEY_SCENES,
  },
  [INFINITE_IQ_CONCEPT.id]: {
    id: INFINITE_IQ_CONCEPT.id,
    concept: INFINITE_IQ_CONCEPT,
    scenes: INFINITE_IQ_SCENES,
  },
  [PENNY_DOUBLE_CONCEPT.id]: {
    id: PENNY_DOUBLE_CONCEPT.id,
    concept: PENNY_DOUBLE_CONCEPT,
    scenes: PENNY_DOUBLE_SCENES,
  },
  [FIVE_HUNDRED_IQ_CONCEPT.id]: {
    id: FIVE_HUNDRED_IQ_CONCEPT.id,
    concept: FIVE_HUNDRED_IQ_CONCEPT,
    scenes: FIVE_HUNDRED_IQ_SCENES,
  },
  [EVERYONE_GONE_CONCEPT.id]: {
    id: EVERYONE_GONE_CONCEPT.id,
    concept: EVERYONE_GONE_CONCEPT,
    scenes: EVERYONE_GONE_SCENES,
  },
  [FREEZE_TIME_CONCEPT.id]: {
    id: FREEZE_TIME_CONCEPT.id,
    concept: FREEZE_TIME_CONCEPT,
    scenes: FREEZE_TIME_SCENES,
  },
  [FIVE_HUNDRED_IQ_PUPPET_CONCEPT.id]: {
    id: FIVE_HUNDRED_IQ_PUPPET_CONCEPT.id,
    concept: FIVE_HUNDRED_IQ_PUPPET_CONCEPT,
    scenes: FIVE_HUNDRED_IQ_PUPPET_SCENES,
  },
  [PRISON_IQ_CONCEPT.id]: {
    id: PRISON_IQ_CONCEPT.id,
    concept: PRISON_IQ_CONCEPT,
    scenes: PRISON_IQ_SCENES,
  },
  [EVERYONE_INVISIBLE_CONCEPT.id]: {
    id: EVERYONE_INVISIBLE_CONCEPT.id,
    concept: EVERYONE_INVISIBLE_CONCEPT,
    scenes: EVERYONE_INVISIBLE_SCENES,
  },
};

export function resolveStory(storyId?: string): RegisteredStory {
  const id = storyId ?? WATER_SYSTEMS_CONCEPT.id;
  const found = STORY_REGISTRY[id];
  if (!found) {
    throw new Error(
      `Unknown story "${id}". Available stories: ${Object.keys(STORY_REGISTRY).join(', ')}`
    );
  }
  return found;
}
