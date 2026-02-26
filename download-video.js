const https = require('https');
const fs = require('fs');
const path = require('path');

const HEYGEN_API_KEY = 'sk_V2_hgu_kDsRDfBP6UV_vbJUnpMueHcQP4IKF6PP3n99TtIXgErA';
const VIDEO_ID = '2671272966ff478bb9494d70b1c984d5';

function checkStatus() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.heygen.com',
      path: `/v1/video_status.get?video_id=${VIDEO_ID}`,
      method: 'GET',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY
      }
    };
    
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

function downloadVideo(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filename);
      });
    }).on('error', reject);
  });
}

async function pollAndDownload() {
  console.log('Checking video status...');
  
  const statusData = await checkStatus();
  
  if (statusData.code === 100 && statusData.data && statusData.data.status === 'completed' && statusData.data.video_url) {
    console.log('Video is ready!');
    const videoUrl = statusData.data.video_url;
    const outputPath = path.join(__dirname, 'Module1_Lesson1_AI_Opportunity.mp4');
    
    console.log('Downloading video from:', videoUrl);
    await downloadVideo(videoUrl, outputPath);
    console.log('Video downloaded to:', outputPath);
    return outputPath;
  } else if (statusData.code !== 100) {
    console.error('API Error:', statusData);
    return null;
  } else {
    console.log('Video still processing or not ready. Status:', statusData.data?.status || 'unknown');
    return null;
  }
}

pollAndDownload()
  .then(result => {
    if (result) {
      console.log('\n🎉 Video ready at:', result);
    } else {
      console.log('\n⏳ Video not ready yet or an error occurred.');
    }
  })
  .catch(error => {
    console.error('❌ Error in pollAndDownload:', error);
  });
