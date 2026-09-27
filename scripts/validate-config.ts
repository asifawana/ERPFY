/**
 * CLI Tool to Validate Production Environment Configuration
 * Usage: npm run config:check
 */

import { validateEnvironmentConfig } from '../lib/config/validator.ts';

const report = validateEnvironmentConfig(process.env);

console.log('\n======================================================================');
console.log('  ERPFY.NET GO-LIVE ENVIRONMENT CONFIGURATION AUDIT');
console.log('======================================================================\n');

console.log(`DEPLOYMENT STATE:        ${report.deploymentState}`);
console.log(`LIVE STATUS:             ${report.liveStatus}`);
console.log(`PRODUCTION READY STATUS: ${report.isProductionReady ? '✅ READY' : '⚠️ NOT READY'}\n`);

console.log(`Summary Counts:`);
console.log(`  Total Evaluated:       ${report.summary.total}`);
console.log(`  READY:                 ${report.summary.ready}`);
console.log(`  MISSING:               ${report.summary.missing}`);
console.log(`  OPTIONAL:              ${report.summary.optional}`);
console.log(`  PRODUCTION REQUIRED:   ${report.summary.productionRequired}\n`);

console.log('----------------------------------------------------------------------');
console.log('Variable Status Breakdown:');
console.log('----------------------------------------------------------------------');

for (const v of report.variables) {
  let icon = 'ℹ️ ';
  if (v.status === 'READY') {
    icon = '✅';
  } else if (v.status === 'PRODUCTION REQUIRED') {
    icon = '🛑';
  } else if (v.status === 'MISSING') {
    icon = '⚠️ ';
  }

  const secretTag = v.isSecret ? '[SECRET PROTECTED]' : '[PUBLIC]';
  console.log(`${icon} [${v.status.padEnd(19)}] ${v.name.padEnd(25)} ${secretTag.padEnd(20)} (${v.category})`);
  console.log(`   ${v.description}`);
  if (v.recommendation && v.status !== 'READY') {
    console.log(`   💡 Action: ${v.recommendation}`);
  }
}

console.log('\n======================================================================');
const liveRequested = process.env.ERPFY_LIVE_ACTIVATION === 'true' || process.env.DEPLOYMENT_STATE === 'LIVE';
if (liveRequested && report.deploymentState !== 'LIVE') {
  console.log('  ⚠️  SECURITY GATE ENFORCED: ERPFY_LIVE_ACTIVATION=true was requested,');
  console.log('      but mandatory production dependencies are missing. Live bypass REJECTED.');
  console.log('----------------------------------------------------------------------');
}

if (report.deploymentState === 'LIVE') {
  console.log('  🚀 STATUS: LIVE — All production services connected and verified.');
} else if (report.deploymentState === 'READY FOR PRODUCTION') {
  console.log('  🏁 STATUS: READY FOR PRODUCTION — Ready for final smoke test & live switch.');
} else {
  console.log('  🔒 STATUS: NOT LIVE — PRODUCTION CONFIGURATION REQUIRED');
}
console.log('======================================================================\n');

if (!report.isProductionReady && process.env.NODE_ENV === 'production') {
  process.exit(1);
} else {
  process.exit(0);
}

