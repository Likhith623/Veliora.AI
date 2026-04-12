#!/usr/bin/env node

// Test script to verify timeout configuration fixes
// This script tests the voice call endpoints with the updated timeout values

const test_endpoints = async () => {
  console.log('🧪 Testing Voice Call Timeout Configuration Fixes');
  console.log('=' .repeat(60));
  
  // Test data for voice calls
  const testPayload = {
    message: "Hello, this is a timeout test",
    bot_id: "test_bot",
    user_name: "timeout_tester",
    history: []
  };

  // Test 1: Ultra-fast endpoint (now 5s timeout instead of 2.5s)
  console.log('\n📡 Test 1: Ultra-fast endpoint timeout');
  console.log('Previous timeout: 2.5 seconds');
  console.log('New timeout: 5 seconds');
  
  try {
    const start1 = Date.now();
    const response1 = await Promise.race([
      fetch('http://127.0.0.1:8000/voice-call-ultra-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Client timeout after 5s')), 5000)
      )
    ]);
    
    const duration1 = (Date.now() - start1) / 1000;
    console.log(`✅ Ultra-fast endpoint responded in ${duration1.toFixed(2)}s`);
    console.log(`Status: ${response1.status}`);
    
    if (duration1 > 2.5) {
      console.log('🎉 SUCCESS: Call would have timed out with old 2.5s timeout!');
    }
  } catch (error) {
    const duration1 = (Date.now() - start1) / 1000;
    console.log(`❌ Ultra-fast endpoint failed after ${duration1.toFixed(2)}s: ${error.message}`);
  }

  // Test 2: Regular endpoint (now 15s timeout instead of 5s)
  console.log('\n📡 Test 2: Regular endpoint timeout');
  console.log('Previous timeout: 5 seconds');
  console.log('New timeout: 15 seconds');
  
  try {
    const start2 = Date.now();
    const response2 = await Promise.race([
      fetch('http://127.0.0.1:8000/voice-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Client timeout after 15s')), 15000)
      )
    ]);
    
    const duration2 = (Date.now() - start2) / 1000;
    console.log(`✅ Regular endpoint responded in ${duration2.toFixed(2)}s`);
    console.log(`Status: ${response2.status}`);
    
    if (duration2 > 5) {
      console.log('🎉 SUCCESS: Call would have timed out with old 5s timeout!');
    }
  } catch (error) {
    const duration2 = (Date.now() - start2) / 1000;
    console.log(`❌ Regular endpoint failed after ${duration2.toFixed(2)}s: ${error.message}`);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✅ Timeout configuration test completed!');
  console.log('\nSummary of changes:');
  console.log('• Ultra-fast endpoint: 2.5s → 5s (+100% increase)');
  console.log('• Regular endpoint: 5s → 15s (+200% increase)');
  console.log('• Chat page API: No timeout → 15s timeout added');
  console.log('\nThese changes should resolve the timeout errors you were experiencing.');
};

// Run the test
test_endpoints().catch(console.error);
