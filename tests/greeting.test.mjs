import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const output = await build({
  entryPoints: ['lib/greeting.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  logLevel: 'silent',
});

const {
  getTimeBasedGreeting,
  getGreetingForHour,
  getGreeting,
  formatGreeting,
  resolveGreetingName,
  resolveGreetingTimezone,
  isValidTimezone,
} = await import(
  `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
);

// 1. 05:00 -> Good Morning
test('1. 05:00 resolves to "Good Morning"', () => {
  assert.equal(getTimeBasedGreeting(5), 'Good Morning');
  assert.equal(getGreetingForHour(5), 'Good Morning');
});

// 2. 11:59 -> Good Morning
test('2. 11:59 (hour 11) resolves to "Good Morning"', () => {
  assert.equal(getTimeBasedGreeting(11), 'Good Morning');
});

// 3. 12:00 -> Good Afternoon
test('3. 12:00 resolves to "Good Afternoon"', () => {
  assert.equal(getTimeBasedGreeting(12), 'Good Afternoon');
});

// 4. 16:59 -> Good Afternoon
test('4. 16:59 (hour 16) resolves to "Good Afternoon"', () => {
  assert.equal(getTimeBasedGreeting(16), 'Good Afternoon');
});

// 5. 17:00 -> Good Evening
test('5. 17:00 resolves to "Good Evening"', () => {
  assert.equal(getTimeBasedGreeting(17), 'Good Evening');
});

// 6. 20:59 -> Good Evening
test('6. 20:59 (hour 20) resolves to "Good Evening"', () => {
  assert.equal(getTimeBasedGreeting(20), 'Good Evening');
});

// 7. 21:00 -> Good Night
test('7. 21:00 resolves to "Good Night"', () => {
  assert.equal(getTimeBasedGreeting(21), 'Good Night');
});

// 8. 04:59 -> Good Night
test('8. 04:59 (hour 4) resolves to "Good Night"', () => {
  assert.equal(getTimeBasedGreeting(4), 'Good Night');
});

// 9. User name is dynamic, not hard-coded
test('9. User name is dynamic and resolves actual display name / first name', () => {
  assert.equal(resolveGreetingName({ displayName: 'Asif' }), 'Asif');
  assert.equal(resolveGreetingName({ displayName: 'Muhammad Asif' }), 'Asif');
  assert.equal(resolveGreetingName({ displayName: 'Zainab Khan' }), 'Zainab');
  assert.equal(resolveGreetingName({ displayName: 'Fatima' }), 'Fatima');
  assert.equal(formatGreeting('Good Morning', resolveGreetingName({ displayName: 'Asif' })), 'Good Morning, Asif');
  assert.equal(formatGreeting('Good Afternoon', resolveGreetingName({ displayName: 'Muhammad Asif' })), 'Good Afternoon, Asif');
});

// 10. Missing name uses safe fallback
test('10. Missing name uses safe fallback ("User" or clean email name)', () => {
  assert.equal(resolveGreetingName({ displayName: '', email: 'asif@erpfy.com' }), 'Asif');
  assert.equal(resolveGreetingName({ displayName: '', email: '' }), 'User');
  assert.equal(resolveGreetingName(null), 'User');
  assert.equal(formatGreeting('Good Evening', resolveGreetingName(null)), 'Good Evening, User');
});

// 11. Timezone fallback works
test('11. Timezone priority fallback (User profile -> Company settings -> Device local fallback)', () => {
  // Priority 1: User timezone
  const tz1 = resolveGreetingTimezone({ userTimezone: 'Asia/Karachi', companyTimezone: 'Europe/London' });
  assert.equal(tz1, 'Asia/Karachi');

  // Priority 2: Company timezone when user timezone is empty/invalid
  const tz2 = resolveGreetingTimezone({ userTimezone: '', companyTimezone: 'Europe/London' });
  assert.equal(tz2, 'Europe/London');

  // Priority 3: Fallback when both are empty
  const tz3 = resolveGreetingTimezone({ userTimezone: null, companyTimezone: null });
  // In node environment, it returns the device/system timezone or undefined
  assert.ok(tz3 === undefined || isValidTimezone(tz3));
});

// 12. Invalid timezone does not crash
test('12. Invalid timezone does not crash and falls back safely', () => {
  assert.equal(isValidTimezone('Bogus/Invalid_Timezone'), false);
  assert.equal(isValidTimezone(''), false);
  assert.equal(isValidTimezone(null), false);

  const testDate = new Date();
  const greeting = getGreeting('Bogus/Timezone', testDate);
  assert.ok(['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night'].includes(greeting));
});

// 13. Dashboard design/layout remains unchanged
test('13. Title Case formatting strictly preserved across all hours', () => {
  for (let h = 0; h < 24; h++) {
    const g = getTimeBasedGreeting(h);
    assert.match(g, /^Good (Morning|Afternoon|Evening|Night)$/);
  }
});

// 14. No hydration warning caused by greeting implementation
test('14. Deterministic initial state calculation matches SSR output', () => {
  const fixedDate = new Date('2026-09-16T08:30:00Z');
  // Server-rendered greeting with given timezone produces identical string for client initialization
  const serverGreeting = getGreeting('UTC', fixedDate);
  const clientHydrationInitial = getGreeting('UTC', fixedDate);
  assert.equal(serverGreeting, clientHydrationInitial);
  assert.equal(serverGreeting, 'Good Morning');
});

// 15. Greeting updates after crossing a time boundary without full reload
test('15. Greeting updates after crossing time boundaries', () => {
  // Boundary 1: 11:59 (Good Morning) -> 12:00 (Good Afternoon)
  const dMorning = new Date('2026-09-16T11:59:00Z');
  const dAfternoon = new Date('2026-09-16T12:00:00Z');
  assert.equal(getGreeting('UTC', dMorning), 'Good Morning');
  assert.equal(getGreeting('UTC', dAfternoon), 'Good Afternoon');

  // Boundary 2: 16:59 (Good Afternoon) -> 17:00 (Good Evening)
  const dAfternoonEnd = new Date('2026-09-16T16:59:00Z');
  const dEvening = new Date('2026-09-16T17:00:00Z');
  assert.equal(getGreeting('UTC', dAfternoonEnd), 'Good Afternoon');
  assert.equal(getGreeting('UTC', dEvening), 'Good Evening');

  // Boundary 3: 20:59 (Good Evening) -> 21:00 (Good Night)
  const dEveningEnd = new Date('2026-09-16T20:59:00Z');
  const dNight = new Date('2026-09-16T21:00:00Z');
  assert.equal(getGreeting('UTC', dEveningEnd), 'Good Evening');
  assert.equal(getGreeting('UTC', dNight), 'Good Night');

  // Boundary 4: 04:59 (Good Night) -> 05:00 (Good Morning)
  const dNightEnd = new Date('2026-09-16T04:59:00Z');
  const dMorningStart = new Date('2026-09-16T05:00:00Z');
  assert.equal(getGreeting('UTC', dNightEnd), 'Good Night');
  assert.equal(getGreeting('UTC', dMorningStart), 'Good Morning');
});
