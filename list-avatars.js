const https = require('https');

const HEYGEN_API_KEY = 'sk_V2_hgu_kDsRDfBP6UV_vbJUnpMueHcQP4IKF6PP3n99TtIXgErA';

function listAvatars() {
  const options = {
    hostname: 'api.heygen.com',
    path: '/v1/avatar/list',
    method: 'GET',
    headers: {
      'X-Api-Key': HEYGEN_API_KEY
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

listAvatars()
  .then(result => {
    console.log('Available avatars:', JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('Error:', error);
  });
