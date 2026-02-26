const https = require('https');
const fs = require('fs');

const HEYGEN_API_KEY = 'sk_V2_hgu_kDsRDfBP6UV_vbJUnpMueHcQP4IKF6PP3n99TtIXgErA';
const VIDEO_ID = '21241763af6b4466a8e3724d784672d4';

function checkStatus() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.heygen.com',
      path: `/v2/video_status?video_id=${VIDEO_ID}`,
      method: 'GET',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Raw Response:', data.substring(0, 500));
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

checkStatus()
  .then(status => {
    console.log('Status:', JSON.stringify(status, null, 2));
  })
  .catch(error => {
    console.error('Error:', error);
  });
