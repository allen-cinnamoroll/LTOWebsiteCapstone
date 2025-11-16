/**
 * Test utilities for verifying production deployment
 * Run these functions in browser console after deployment
 */

/**
 * Test avatar URL construction
 * Run in browser console: testAvatarURLs()
 */
export const testAvatarURLs = () => {
  console.group('🧪 Testing Avatar URL Construction');
  
  const { getAvatarURL } = require('./urlUtils');
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');
  
  // Test 1: Check environment variable
  const baseURL = import.meta.env.VITE_BASE_URL;
  console.log('1. VITE_BASE_URL:', baseURL);
  console.log('   ✅ Should use https:// in production');
  
  // Test 2: Check avatar URL construction
  const testPath = 'uploads/avatars/test-avatar.jpg';
  const constructedURL = getAvatarURL(testPath);
  console.log('2. Test avatar URL construction:');
  console.log('   Input:', testPath);
  console.log('   Output:', constructedURL);
  console.log('   ✅ Should start with https://');
  console.log('   ❌ Should NOT contain localhost');
  
  // Test 3: Check actual user avatar
  if (userData?.avatar) {
    console.log('3. Current user avatar URL:', userData.avatar);
    const isHTTPS = userData.avatar.startsWith('https://');
    const hasLocalhost = userData.avatar.includes('localhost');
    
    if (isHTTPS && !hasLocalhost) {
      console.log('   ✅ Avatar URL is correct (HTTPS, no localhost)');
    } else {
      console.log('   ❌ Avatar URL has issues:', {
        isHTTPS,
        hasLocalhost
      });
    }
  } else {
    console.log('3. No user avatar found');
  }
  
  // Test 4: Check for hardcoded URLs
  console.log('4. Checking for hardcoded URLs...');
  console.log('   VITE_BASE_URL default:', baseURL || 'Not set');
  
  if (!baseURL || baseURL.includes('localhost')) {
    console.warn('   ⚠️  VITE_BASE_URL might be using localhost in production!');
  } else {
    console.log('   ✅ VITE_BASE_URL looks correct');
  }
  
  console.groupEnd();
};

/**
 * Test model info fetching configuration
 * Run in browser console: testModelInfoConfig()
 */
export const testModelInfoConfig = () => {
  console.group('🧪 Testing Model Info Configuration');
  
  // Test 1: Check environment variables
  const accidentAPI = import.meta.env.VITE_ACCIDENT_PRED_API;
  console.log('1. VITE_ACCIDENT_PRED_API:', accidentAPI);
  
  if (!accidentAPI) {
    console.warn('   ⚠️  VITE_ACCIDENT_PRED_API not set!');
  } else if (accidentAPI.includes('localhost') && window.location.protocol === 'https:') {
    console.warn('   ⚠️  Using localhost in production!');
  } else {
    console.log('   ✅ API URL looks correct');
  }
  
  // Test 2: Check expected endpoint
  const expectedURL = `${accidentAPI}/api/accidents/health`;
  console.log('2. Expected health endpoint:', expectedURL);
  
  // Test 3: Verify URL structure
  if (window.location.protocol === 'https:' && expectedURL.startsWith('http://')) {
    console.warn('   ⚠️  Mixed content risk: HTTPS page calling HTTP API!');
  } else if (expectedURL.startsWith('https://')) {
    console.log('   ✅ Using HTTPS for API calls');
  } else {
    console.log('   ℹ️  Using HTTP (expected in development)');
  }
  
  console.groupEnd();
};

/**
 * Test actual model info fetching
 * Run in browser console: testModelInfoFetch()
 * Note: This will make an actual API call
 */
export const testModelInfoFetch = async () => {
  console.group('🧪 Testing Model Info Fetch');
  
  const accidentAPI = import.meta.env.VITE_ACCIDENT_PRED_API || 
                      (import.meta.env.DEV ? 'http://localhost:5004' : '/accident-prediction-api');
  const url = `${accidentAPI}/api/accidents/health`;
  
  console.log('Fetching from:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log('Response status:', response.status, response.statusText);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Non-OK response:', response.status);
      console.error('Response text (first 200 chars):', text.substring(0, 200));
      console.groupEnd();
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Non-JSON response received');
      console.error('Content-Type:', contentType);
      console.error('Response text (first 200 chars):', text.substring(0, 200));
      console.groupEnd();
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Successfully parsed JSON response');
    console.log('Response data:', data);
    
    if (data.status === 'ok' && data.model_loaded) {
      console.log('✅ Model is loaded and ready');
      console.groupEnd();
      return true;
    } else {
      console.warn('⚠️  Model not loaded on server');
      console.groupEnd();
      return false;
    }
  } catch (err) {
    console.error('❌ Error fetching model info:', err);
    console.error('Error message:', err.message);
    console.groupEnd();
    return false;
  }
};

/**
 * Run all tests
 * Run in browser console: runAllTests()
 */
export const runAllTests = async () => {
  console.log('🚀 Running All Production Tests...\n');
  
  testAvatarURLs();
  console.log('\n');
  
  testModelInfoConfig();
  console.log('\n');
  
  console.log('⚠️  Model info fetch test will make an actual API call...');
  console.log('Run testModelInfoFetch() separately if needed.\n');
  
  console.log('✅ Basic tests complete!');
};

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  window.testAvatarURLs = testAvatarURLs;
  window.testModelInfoConfig = testModelInfoConfig;
  window.testModelInfoFetch = testModelInfoFetch;
  window.runAllTests = runAllTests;
  
  console.log('📝 Test utilities loaded! Run in console:');
  console.log('  - testAvatarURLs()');
  console.log('  - testModelInfoConfig()');
  console.log('  - testModelInfoFetch()');
  console.log('  - runAllTests()');
}

