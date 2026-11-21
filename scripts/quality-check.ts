import path from 'node:path';
import { loadProductionPlan } from '../src/pipeline/production/productionStore.js';
import { runQualityChecks } from '../src/pipeline/rendering/qualityChecker.js';

function main(): void {
  const plan = loadProductionPlan();
  const customVideo = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const defaultFinal = path.join(process.cwd(), 'output', 'videos', `${plan.projectId}.mp4`);
  const videoPath = customVideo ?? defaultFinal;

  const report = runQualityChecks(plan, videoPath);
  console.log(`[quality-check] Overall Status: ${report.overallPass ? 'PASS' : 'FAIL'}`);
  for (const c of report.checks) {
    console.log(`  [${c.passed ? 'PASS' : 'FAIL'}] ${c.name}: ${c.details}`);
  }
  if (!report.overallPass) {
    process.exit(1);
  }
}

main();
