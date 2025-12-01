const axios = require('axios');

async function testRegister() {
  try {
    console.log('🧪 Testing registration API...\n');
    
    const testUser = {
      username: 'testuser_' + Date.now(),
      email: `test_${Date.now()}@test.com`,
      password: '123456'
    };
    
    console.log('📤 Sending request to: http://localhost:3000/api/auth/register');
    console.log('📦 Data:', {
      ...testUser,
      password: '***'
    });
    
    const response = await axios.post('http://localhost:3000/api/auth/register', testUser);
    
    console.log('\n✅ SUCCESS!');
    console.log('📥 Response:', response.data);
    console.log('\nToken:', response.data.token);
    console.log('User:', response.data.user);
    
  } catch (error) {
    console.log('\n❌ ERROR!');
    console.log('Status:', error.response?.status);
    console.log('Error message:', error.response?.data?.message);
    console.log('Full error:', error.response?.data);
    
    if (error.response?.data?.errors) {
      console.log('\nValidation errors:');
      error.response.data.errors.forEach(err => {
        console.log(`  - ${err.msg} (${err.param})`);
      });
    }
  }
}

testRegister();
