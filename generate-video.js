const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || 'sk_V2_hgu_kDsRDfBP6UV_vbJUnpMueHcQP4IKF6PP3n99TtIXgErA';
const AVATAR_NAME = 'Henry';

// Module 1, Lesson 1: The AI Opportunity
const videoScript = `Welcome to the AI Hustle Engine. I'm Henry, and over the next few minutes, I'm going to show you why right now is the single best time in history to build income streams with AI.

Here's the thing. Every few decades, a technology comes along that completely reshapes how business works. The internet in the nineties. Smartphones in the late 2000s. And now, AI.

But here's what makes AI different. With the internet, you needed to learn to code or build websites. With smartphones, you needed to build apps. But with AI? You just need to know how to ask the right questions.

The people who figured out the internet early became millionaires. Same with smartphones and apps. And right now, we're at that exact moment with AI.

Think about this. A year ago, creating a professional logo required a designer and hundreds of dollars. Today, you can do it in thirty seconds with AI. Writing a blog post took hours. Now it takes minutes.

But here's the key insight. Most people are using AI as a toy. They're asking it to write jokes or create funny images. But a small group of people? They're using AI as a tool to build real businesses.

In this course, I'm going to show you exactly how to be in that second group. How to turn AI from something you play with into something that pays you.

By the end of this module, you'll understand exactly what the AI opportunity is, what tools you need, and how to start using them for income. Let's get started.`;

async function generateVideo() {
  console.log('🎬 Starting video generation...');
  console.log('Script:', videoScript.substring(0, 100) + '...');
  
  // HeyGen API endpoint
  const options = {
    hostname: 'api.heygen.com',
    path: '/v2/video/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': HEYGEN_API_KEY
    }
  };
  
  const requestBody = JSON.stringify({
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: 'Henry', // Using the avatar name provided
        avatar_style: 'normal'
      },
      voice: {
        type: 'text',
        input_text: videoScript,
        voice_id: 'en-US-JennyNeural', // Professional female voice
        speed: 1.0
      },
      background: {
        type: 'color',
        value: '#1a1a2e' // Dark professional background
      }
    }],
    dimension: {
      width: 1920,
      height: 1080
    },
    title: 'AI Hustle Engine - Module 1 Lesson 1'
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Video generation started!');
          console.log('Response:', JSON.stringify(response, null, 2));
          resolve(response);
        } catch (error) {
          console.error('❌ Error parsing response:', error);
          console.error('Raw response:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });
    
    req.write(requestBody);
    req.end();
  });
}

// Execute
generateVideo()
  .then(result => {
    console.log('\n🎉 Video generation initiated successfully!');
    console.log('Video ID:', result.data?.video_id || 'Check response above');
    
    // Save the video ID for later retrieval
    if (result.data?.video_id) {
      fs.writeFileSync(
        '/home/clawd/clawd/projects/ai-hustle-website/video_ids.json',
        JSON.stringify({
          videos: [{
            id: result.data.video_id,
            title: 'Module 1 Lesson 1 - The AI Opportunity',
            created_at: new Date().toISOString()
          }]
        }, null, 2)
      );
      console.log('Video ID saved for tracking');
    }
  })
  .catch(error => {
    console.error('\n❌ Video generation failed:', error);
    process.exit(1);
  });
