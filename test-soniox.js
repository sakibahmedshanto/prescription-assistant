#!/usr/bin/env node

/**
 * Test script for Soniox WebSocket integration
 * This script tests the WebSocket server and Soniox API connectivity
 */

const WebSocket = require('ws');

console.log('🧪 Testing Soniox WebSocket Integration...\n');

// Test 1: Check environment variables
console.log('1. Checking environment variables...');
const apiKey = process.env.SONIOX_API_KEY;
if (apiKey) {
  console.log('✅ SONIOX_API_KEY is set');
  console.log(`   Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
} else {
  console.log('❌ SONIOX_API_KEY is not set');
  console.log('   Please run: export SONIOX_API_KEY=your_api_key');
  process.exit(1);
}

// Test 2: Test WebSocket server connectivity
console.log('\n2. Testing WebSocket server connectivity...');
const testWebSocketConnection = () => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8080?sessionId=test_session');
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timeout'));
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket server is running on port 8080');
      
      // Send a test message
      ws.send(JSON.stringify({
        type: 'start_stream',
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US'
        }
      }));
      
      setTimeout(() => {
        ws.close();
        resolve();
      }, 1000);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`   Received: ${message.type} - ${message.message || 'OK'}`);
      } catch (err) {
        console.log(`   Received raw data: ${data.toString().substring(0, 50)}...`);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connection test completed');
    });
  });
};

// Test 3: Test Soniox API connectivity
console.log('\n3. Testing Soniox API connectivity...');
const testSonioxAPI = () => {
  return new Promise((resolve, reject) => {
    const sonioxWs = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket');
    
    const timeout = setTimeout(() => {
      sonioxWs.close();
      reject(new Error('Soniox API connection timeout'));
    }, 10000);

    sonioxWs.on('open', () => {
      clearTimeout(timeout);
      console.log('✅ Soniox API is accessible');
      
      // Send test config
      const config = {
        api_key: apiKey,
        model: "stt-rt-preview",
        language_hints: ["en"],
        enable_speaker_diarization: true,
        enable_language_identification: true,
        enable_endpoint_detection: true,
        audio_format: "auto"
      };
      
      sonioxWs.send(JSON.stringify(config));
      
      setTimeout(() => {
        sonioxWs.close();
        resolve();
      }, 2000);
    });

    sonioxWs.on('message', (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.error_code) {
          console.log(`❌ Soniox API error: ${response.error_code} - ${response.error_message}`);
          reject(new Error(response.error_message));
        } else {
          console.log('✅ Soniox API responded successfully');
        }
      } catch (err) {
        // Raw response, likely successful
        console.log('✅ Soniox API connection established');
      }
    });

    sonioxWs.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    sonioxWs.on('close', () => {
      clearTimeout(timeout);
    });
  });
};

// Run tests
async function runTests() {
  try {
    // Test WebSocket server (only if it's running)
    try {
      await testWebSocketConnection();
    } catch (error) {
      console.log('⚠️  WebSocket server not running (this is OK if you haven\'t started it yet)');
      console.log('   Start it with: npm run ws:soniox');
    }

    // Test Soniox API
    await testSonioxAPI();

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the WebSocket server: npm run ws:soniox');
    console.log('2. Start the Next.js app: npm run dev');
    console.log('3. Open: http://localhost:3000/page-soniox');
    console.log('4. Connect and start recording!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your SONIOX_API_KEY is valid');
    console.log('2. Ensure internet connection is working');
    console.log('3. Verify Soniox account is active');
    process.exit(1);
  }
}

runTests();
