const https = require('https');

const HEYGEN_API_KEY = 'sk_V2_hgu_kDsRDfBP6UV_vbJUnpMueHcQP4IKF6PP3n99TtIXgErA';

// Shorter script - under 60 seconds (~150 words)
const videoScript = `Welcome to the AI Hustle Engine. I'm Henry.

Every few decades, a technology comes along that reshapes business. The internet in the nineties. Smartphones in the 2000s. And now, AI.

But here's what makes AI different. You don't need to code. You don't need to build apps. You just need to know how to ask the right questions.

The people who figured out the internet early became millionaires. We're at that exact moment with AI right now.

Most people use AI as a toy. But a small group uses it as a tool to build real businesses.

In this course, I'll show you how to be in that second group. How to turn AI from something you play with into something that pays you.

Let's get started.`;

const requestBody = JSON.stringify({
  video_inputs: [{
    character: {
      type: 'avatar',
      avatar_id: 'Daisy-inskirt-20220818',
      avatar_style: 'normal'
    },
    voice: {
      type: 'text',
      input_text: videoScript,
      voice_id: '1bd001e7e50f421d891986aad5158bc8'
    },
    background: {
      type: 'color',
      value: '#1a1a2e'
    }
  }],
  dimension: {
    width: 1920,
    height: 1080
  },
  title: 'AI Hustle Engine - Module 1 Lesson 1'
});

const options = {
  hostname: 'api.heygen.com',
  path: '/v2/video/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': HEYGEN_API_KEY
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const json = JSON.parse(data);
      console.log('Video ID:', json.data?.video_id);
    } catch(e) {
      console.log('Error:', data);
    }
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(requestBody);
req.end();
