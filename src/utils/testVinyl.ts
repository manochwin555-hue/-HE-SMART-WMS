import { calculateVinylWrappingStatus, validateVinylWrappingAllowed } from './vinylWrappingRule';

function runTests() {
  const baseDate = new Date('2026-09-01T00:00:00Z');
  let passed = 0;
  let total = 0;

  function assertEqual(name: string, actual: any, expected: any) {
    total++;
    if (actual === expected) {
      console.log(`✅ ${name} passed`);
      passed++;
    } else {
      console.error(`❌ ${name} failed: Expected ${expected} but got ${actual}`);
    }
  }

  // Test 1: Age 0
  let res = calculateVinylWrappingStatus('2026-09-01', '2026-09-01', 'OK', baseDate);
  assertEqual('Test 1: Age 0 - NORMAL', res.agingStatus, 'NORMAL');

  // Test 2: Age 21
  const date21 = new Date(baseDate); date21.setDate(date21.getDate() + 21);
  res = calculateVinylWrappingStatus('2026-09-01', '2026-09-01', 'OK', date21);
  assertEqual('Test 2: Age 21 - NORMAL', res.agingStatus, 'NORMAL');

  // Test 3: Age 22
  const date22 = new Date(baseDate); date22.setDate(date22.getDate() + 22);
  res = calculateVinylWrappingStatus('2026-09-01', '2026-09-01', 'OK', date22);
  assertEqual('Test 3: Age 22 - WARNING', res.agingStatus, 'WARNING');

  // Test 4: Age 24
  const date24 = new Date(baseDate); date24.setDate(date24.getDate() + 24);
  res = calculateVinylWrappingStatus('2026-09-01', '2026-09-01', 'OK', date24);
  assertEqual('Test 4: Age 24 - WARNING', res.agingStatus, 'WARNING');

  // Test 5: Age 25
  const date25 = new Date(baseDate); date25.setDate(date25.getDate() + 25);
  res = calculateVinylWrappingStatus('2026-09-01', '2026-09-01', 'OK', date25);
  assertEqual('Test 5: Age 25 - URGENT', res.agingStatus, 'URGENT');

  // Test 6: Age 27
  const date27 = new Date(baseDate); date27.setDate(date27.getDate() + 27);
  res = calculateVinylWrappingStatus('2026-09-01', '2026-09-01', 'OK', date27);
  assertEqual('Test 6: Age 27 - URGENT', res.agingStatus, 'URGENT');

  // Test 7: Age 28
  const date28 = new Date(baseDate); date28.setDate(date28.getDate() + 28);
  res = calculateVinylWrappingStatus('2026-09-01', '2026-09-01', 'OK', date28);
  assertEqual('Test 7: Age 28 - DUE_TODAY', res.agingStatus, 'DUE_TODAY');
  assertEqual('Test 7: Age 28 - Hold', res.holdStatus, true);

  // Test 8: Age 29
  const date29 = new Date(baseDate); date29.setDate(date29.getDate() + 29);
  res = calculateVinylWrappingStatus('2026-09-01', '2026-09-01', 'OK', date29);
  assertEqual('Test 8: Age 29 - EXPIRED', res.agingStatus, 'EXPIRED');
  assertEqual('Test 8: Age 29 - Hold', res.holdStatus, true);

  // Test 9: Condition NG
  const date5 = new Date(baseDate); date5.setDate(date5.getDate() + 5);
  res = calculateVinylWrappingStatus('2026-09-01', '2026-09-01', 'TORN', date5);
  assertEqual('Test 9: Age 5 but TORN - CONDITION_NG', res.agingStatus, 'CONDITION_NG');
  assertEqual('Test 9: Age 5 but TORN - Hold', res.holdStatus, true);

  // Test 10: Validation CSKD
  let valid = validateVinylWrappingAllowed('CSKD', 'INDOOR');
  assertEqual('Test 10: CSKD not allowed', valid.allowed, false);

  // Test 11: Validation OUTDOOR
  valid = validateVinylWrappingAllowed('IN_HOUSE', 'OUTDOOR');
  assertEqual('Test 11: OUTDOOR not allowed', valid.allowed, false);

  // Test 12: No Date
  res = calculateVinylWrappingStatus(undefined, undefined, 'OK', baseDate);
  assertEqual('Test 12: No Date - DATA_INCOMPLETE', res.agingStatus, 'DATA_INCOMPLETE');
  assertEqual('Test 12: No Date - Hold', res.holdStatus, true);
  
  console.log(`--- Test Results: ${passed}/${total} Passed ---`);
}

runTests();
