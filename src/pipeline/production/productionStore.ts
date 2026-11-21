import fs from 'node:fs';
import path from 'node:path';
import {
  ProductionPlan,
  ProductionPlanSchema,
  SceneScript,
  SceneScriptSchema,
  StoryConcept,
  StoryConceptSchema,
} from '../../services/scripting/schema.js';
import { z } from 'zod';

export const SCRIPT_FILE = path.join(process.cwd(), 'output', 'reports', 'script.json');
export const PLAN_FILE = path.join(process.cwd(), 'output', 'reports', 'production-plan.json');
export const QA_JSON_FILE = path.join(process.cwd(), 'output', 'reports', 'qa-report.json');
export const QA_MD_FILE = path.join(process.cwd(), 'output', 'reports', 'qa-report.md');

const ScriptBundleSchema = z.object({
  generatedAt: z.string(),
  referenceStyleBible: z.string(),
  concept: StoryConceptSchema,
  scenes: z.array(SceneScriptSchema),
});

export type ScriptBundle = z.infer<typeof ScriptBundleSchema>;

export function saveScriptBundle(concept: StoryConcept, scenes: SceneScript[]): string {
  const bundle: ScriptBundle = {
    generatedAt: new Date().toISOString(),
    referenceStyleBible: 'REFERENCE_STYLE_BIBLE.md',
    concept,
    scenes,
  };
  ScriptBundleSchema.parse(bundle);
  fs.mkdirSync(path.dirname(SCRIPT_FILE), { recursive: true });
  fs.writeFileSync(SCRIPT_FILE, JSON.stringify(bundle, null, 2), 'utf8');
  return SCRIPT_FILE;
}

export function loadScriptBundle(): ScriptBundle {
  if (!fs.existsSync(SCRIPT_FILE)) {
    throw new Error(`Script file not found at ${SCRIPT_FILE}. Run "npm run generate:script" first.`);
  }
  const raw = JSON.parse(fs.readFileSync(SCRIPT_FILE, 'utf8'));
  return ScriptBundleSchema.parse(raw);
}

export function saveProductionPlan(plan: ProductionPlan): string {
  ProductionPlanSchema.parse(plan);
  fs.mkdirSync(path.dirname(PLAN_FILE), { recursive: true });
  fs.writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2), 'utf8');
  return PLAN_FILE;
}

export function loadProductionPlan(): ProductionPlan {
  if (!fs.existsSync(PLAN_FILE)) {
    throw new Error(`Production plan not found at ${PLAN_FILE}. Run "npm run generate:voice" first.`);
  }
  const raw = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
  return ProductionPlanSchema.parse(raw);
}
