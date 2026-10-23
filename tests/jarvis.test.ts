// tests/jarvis.test.ts - Automated test suite for J.A.R.V.I.S.-O Core

import { SAFE_TOOLS } from '../tools/registry';
import {
  createConversation,
  appendMessage,
  getConversation,
  deleteConversation,
  listConversations,
} from '../services/conversation.service';
import {
  indexDocument,
  searchDocuments,
  removeFile,
  listFiles,
} from '../services/file.service';
import { getConfig, isProviderConfigured } from '../config/env';
import { APPROVED_PROVIDERS } from '../config/ai-config';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failed++;
  }
}

export async function runAllTests() {
  console.log('\n=============================================');
  console.log('--- J.A.R.V.I.S.-O AUTOMATED TEST SUITE ---');
  console.log('=============================================\n');

  // 1. Environment & Provider Configuration Tests
  console.log('[1] Configuration & Provider Allowlist Tests');
  const config = getConfig();
  assert(config.name === 'J.A.R.V.I.S.-O', 'Default system name is J.A.R.V.I.S.-O');
  assert(config.defaultProvider === 'gemini', 'Default AI provider is Gemini');
  assert(
    Object.keys(APPROVED_PROVIDERS).length === 4,
    'Exactly 4 approved providers exist: gemini, nvidia, llm7, openrouter'
  );
  assert(
    Boolean(APPROVED_PROVIDERS.gemini && APPROVED_PROVIDERS.nvidia && APPROVED_PROVIDERS.llm7 && APPROVED_PROVIDERS.openrouter),
    'All 4 approved providers properly indexed'
  );

  // 2. Deterministic Safe Tools Tests
  console.log('\n[2] Safe Deterministic Tools Tests');

  // Calculator
  const calc1 = SAFE_TOOLS.calculator.execute({ expression: 'sqrt(144) * 5 + 12^2' });
  assert(calc1.result === 204, 'Calculator correctly evaluates "sqrt(144) * 5 + 12^2" = 204');

  const calc2 = SAFE_TOOLS.calculator.execute({ expression: '500 / 0' });
  assert(calc2.success === false, 'Calculator safely rejects division by zero without crashing');

  // Unit Conversion
  const conv1 = SAFE_TOOLS.unitConversion.execute({ value: 100, from: 'celsius', to: 'fahrenheit' });
  assert(conv1.convertedValue === 212, 'Unit converter evaluates 100 C to 212 F');

  const conv2 = SAFE_TOOLS.unitConversion.execute({ value: 10, from: 'km', to: 'miles' });
  assert(conv2.success === true && typeof conv2.convertedValue === 'number', 'Unit converter converts km to miles');

  // Date Time
  const dt = SAFE_TOOLS.dateTime.execute({});
  assert(Array.isArray(dt.starkClocks) && dt.starkClocks.length >= 4, 'DateTime provides world Stark command clocks');

  // Text Tools
  const tt = SAFE_TOOLS.textTools.execute({ text: 'Stark Industries Defense Grid', operation: 'slugify' });
  assert(tt.result === 'stark-industries-defense-grid', 'Text tool correctly slugifies string');

  // JSON Validator
  const jv = SAFE_TOOLS.jsonValidator.execute({ jsonString: '{"protocol": "Clean Slate", "active": true}' });
  assert(jv.valid === true && jv.keysCount === 2, 'JSON validator verifies valid JSON');

  // 3. Conversation Memory & Session Isolation Tests
  console.log('\n[3] Conversation Memory & Session Isolation Tests');
  const sessionA = 'test-session-tony-001';
  const sessionB = 'test-session-rhodey-002';

  const convA = createConversation(sessionA, 'Mark 85 Flight Diagnostics');
  assert(convA.id.startsWith('conv-'), 'Created conversation with valid ID format');

  appendMessage(sessionA, convA.id, { role: 'user', content: 'Divert power to auxiliary thrusters' });
  const retrievedA = getConversation(sessionA, convA.id);
  assert(
    retrievedA !== null && retrievedA.messages.length >= 2,
    'Message history appended and preserved in session A'
  );

  // Isolation check: session B should NOT see session A's conversation
  const isolatedList = listConversations(sessionB);
  assert(
    isolatedList.length === 0,
    'Session B is completely isolated from Session A conversations'
  );

  // Deletion check
  const deleted = deleteConversation(sessionA, convA.id);
  assert(deleted === true, 'Conversation cleanly purged from session memory');

  // 4. Document Indexing & Search Tests
  console.log('\n[4] Document Indexing & Semantic Search Tests');
  const docText = `
    Section 1: The Mark LXXXV is Tony Stark's eighty-fifth Iron Man suit. It features enhanced nanotech capability.
    
    Section 2: The Arc Reactor palladium isotope was replaced by a newly synthesized element discovered via Howard Stark's diorama model.
    
    Section 3: VERONICA is an autonomous orbital weapons and support platform created by Tony Stark and Bruce Banner.
  `;

  const indexedDoc = indexDocument(sessionA, 'stark_manual.txt', 'text/plain', docText, docText.length);
  assert(indexedDoc.chunksCount >= 3, 'Document correctly chunked into searchable paragraphs');

  const matches = searchDocuments(sessionA, 'VERONICA orbital platform', 2);
  assert(matches.length > 0 && matches[0].content.includes('VERONICA'), 'Relevant document chunk retrieved by search');

  removeFile(sessionA, indexedDoc.id);
  assert(listFiles(sessionA).length === 0, 'Document and chunks purged on delete');

  console.log('\n=============================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================\n');

  return { passed, failed };
}

// Self-run if called directly
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('jarvis.test.ts')) {
  runAllTests();
}
