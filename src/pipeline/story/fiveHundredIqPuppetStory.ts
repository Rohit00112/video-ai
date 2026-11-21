import { PuppetBeat, SceneScript, StoryConcept } from '../../services/scripting/schema.js';
import { FIVE_HUNDRED_IQ_CONCEPT, FIVE_HUNDRED_IQ_SCENES } from './fiveHundredIqStory.js';

/**
 * Same narration/voice as five-hundred-iq-v1 (scene ids kept → cached ElevenLabs audio is reused),
 * but characters are animated 2D puppets acting over EMPTY painted backgrounds.
 */
export const FIVE_HUNDRED_IQ_PUPPET_CONCEPT: StoryConcept = {
  ...FIVE_HUNDRED_IQ_CONCEPT,
  id: 'five-hundred-iq-puppets-v1',
  title: 'What If You Woke Up With 500 IQ? (animated puppets)',
};

type P = Omit<PuppetBeat, 'scale' | 'facing' | 'expression' | 'outfit' | 'actions'> & Partial<PuppetBeat>;
const pp = (b: P): PuppetBeat => ({ scale: 1, facing: 'front', expression: 'happy', outfit: 'default', actions: [], ...b });

/** Background-only prompts + puppet acting per scene id */
const DIRECTION: Record<string, { bg: string; motion?: 'push_in' | 'pull_out' | 'pan_left' | 'pan_right' | 'drift_up' | 'hold'; puppets: PuppetBeat[] }> = {
  'iq-01-hook': {
    bg: 'Sunny European city crosswalk with white zebra stripes, pastel buildings with green shutters and a turquoise-domed cathedral in the distance, warm morning light, faint golden sparkles in the air.',
    puppets: [
      pp({ id: 'alex', x: 0.5, y: 0.93, scale: 1.15, expression: 'surprised', actions: [{ at: 0, action: 'surprised' }, { at: 0.45, action: 'cheer', expression: 'excited' }] }),
    ],
  },
  'iq-02-payoff': {
    bg: 'Rainy evening European street, wet cobblestones reflecting warm street-lamp light, blue rainy atmosphere.',
    motion: 'pull_out',
    puppets: [
      pp({ id: 'chloe', x: 0.66, y: 0.84, scale: 0.72, facing: 'right', expression: 'annoyed', actions: [{ at: 0, action: 'cross_arms' }, { at: 0.42, action: 'walk', toX: 1.15 }] }),
      pp({ id: 'alex', x: 0.42, y: 0.94, scale: 1.05, expression: 'smug', actions: [{ at: 0, action: 'hands_hips' }, { at: 0.5, action: 'shrug', expression: 'worried' }] }),
    ],
  },
  'iq-03-homework': {
    bg: 'Cozy bedroom at 8 AM lit by a warm desk lamp: a wooden desk at the side with a very tall stack of finished homework papers, bookshelf, bed with blanket, soft morning window light.',
    puppets: [
      pp({ id: 'alex', x: 0.48, y: 0.93, scale: 1.1, outfit: 'labcoat', actions: [{ at: 0, action: 'think' }, { at: 0.5, action: 'cheer', expression: 'excited' }] }),
    ],
  },
  'iq-04-grammar': {
    bg: 'Sunny city sidewalk with cafe awnings, shop windows and trees, warm afternoon light.',
    motion: 'pan_right',
    puppets: [
      pp({ id: 'alex', x: 0.3, y: 0.93, scale: 0.98, facing: 'right', outfit: 'labcoat', expression: 'smug', actions: [{ at: 0, action: 'talk' }, { at: 0.42, action: 'point' }] }),
      pp({ id: 'chloe', x: 0.72, y: 0.93, scale: 0.94, facing: 'left', actions: [{ at: 0, action: 'idle' }, { at: 0.5, action: 'cross_arms', expression: 'annoyed' }] }),
    ],
  },
  'iq-05-economy': {
    bg: 'Town plaza celebration: colorful bunting, confetti and paper money falling, a large blank wooden signboard (no writing), a softly blurred cheering crowd far in the background.',
    motion: 'drift_up',
    puppets: [
      pp({ id: 'alex', x: 0.34, y: 0.93, scale: 0.98, outfit: 'labcoat', expression: 'smug', actions: [{ at: 0, action: 'hands_hips' }] }),
      pp({ id: 'mayor', x: 0.7, y: 0.93, scale: 1.0, facing: 'left', expression: 'excited', actions: [{ at: 0, action: 'wave' }, { at: 0.5, action: 'cheer' }] }),
    ],
  },
  'iq-06-pizza-cube': {
    bg: 'Cozy restaurant kitchen with copper pans and a wood-fired oven; on the counter in the middle, a perfectly smooth grey cube sits on a pizza plate.',
    puppets: [
      pp({ id: 'alex', x: 0.26, y: 0.94, scale: 0.95, facing: 'right', outfit: 'labcoat', expression: 'smug', actions: [{ at: 0, action: 'talk' }, { at: 0.55, action: 'hands_hips' }] }),
      pp({ id: 'chef', x: 0.74, y: 0.94, scale: 0.98, facing: 'left', expression: 'neutral', actions: [{ at: 0, action: 'idle' }, { at: 0.55, action: 'facepalm', expression: 'worried' }] }),
    ],
  },
  'iq-07-sunset': {
    bg: 'Rooftop wooden deck with a railing and potted plants at golden sunset, a big glowing sun over old-town rooftops and domes.',
    motion: 'pan_left',
    puppets: [
      pp({ id: 'alex', x: 0.3, y: 0.93, scale: 0.96, facing: 'right', outfit: 'labcoat', expression: 'excited', actions: [{ at: 0, action: 'point' }, { at: 0.45, action: 'talk' }] }),
      pp({ id: 'chloe', x: 0.7, y: 0.93, scale: 0.94, facing: 'left', expression: 'tired', actions: [{ at: 0, action: 'idle' }, { at: 0.45, action: 'slump' }] }),
    ],
  },
  'iq-08-twist': {
    bg: 'Rooftop wooden deck at golden sunset with warm string lights overhead, old-town rooftops and domes, joyful glowing atmosphere.',
    motion: 'pull_out',
    puppets: [
      pp({ id: 'granny', x: 0.8, y: 0.9, scale: 0.84, expression: 'happy_closed', actions: [{ at: 0, action: 'idle' }, { at: 0.5, action: 'cheer' }] }),
      pp({ id: 'chloe', x: 0.56, y: 0.91, scale: 0.9, expression: 'neutral', actions: [{ at: 0, action: 'idle' }, { at: 0.55, action: 'dance', expression: 'excited' }] }),
      pp({ id: 'alex', x: 0.28, y: 0.94, scale: 0.96, outfit: 'tophat', expression: 'neutral', actions: [{ at: 0, action: 'shrug' }, { at: 0.35, action: 'dance', expression: 'excited' }] }),
    ],
  },
  'iq-09-loop': {
    bg: 'Sunny European city crosswalk with white zebra stripes, pastel buildings with green shutters and a turquoise-domed cathedral in the distance, warm morning light, faint golden sparkles in the air.',
    puppets: [
      pp({ id: 'alex', x: 0.5, y: 0.93, scale: 1.15, outfit: 'tophat', actions: [{ at: 0, action: 'shrug' }, { at: 0.6, action: 'wave', expression: 'excited' }] }),
    ],
  },
};

export const FIVE_HUNDRED_IQ_PUPPET_SCENES: SceneScript[] = FIVE_HUNDRED_IQ_SCENES.map((s) => {
  const d = DIRECTION[s.id];
  if (!d) return s;
  return {
    ...s,
    illustration: {
      prompt: d.bg,
      motion: d.motion ?? 'push_in',
      focus: [0.5, 0.6] as [number, number],
    },
    puppets: d.puppets,
  };
});
