/**
 * Generate all AI Hustle Engine course videos via HeyGen API
 * Run after approving Module 1 Lesson 1
 */

const https = require('https');
const fs = require('fs');

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || 'sk_V2_hgu_kDsRDfBP6UV_vbJUnpMueHcQP4IKF6PP3n99TtIXgErA';
const AVATAR_ID = 'Daisy-inskirt-20220818';
const VOICE_ID = '1bd001e7e50f421d891986aad5158bc8';

// All lessons with scripts (under 60 seconds each ~120-140 words)
const LESSONS = [
  {
    module: 1, lesson: 2,
    title: 'The 5 AI Income Models',
    script: `There are five core ways to make money with AI. Not ten, not twenty — five.

First: AI freelancing. Sell AI-powered services like content creation, image generation, or automation to businesses. Second: AI products. Build and sell digital products — ebooks, prompts, templates, courses — that solve specific problems.

Third: AI agency. Package AI services into productized offerings for recurring clients. Fourth: AI content. Build an audience using AI-accelerated content creation, then monetize through ads, sponsorships, and products.

Fifth: AI automation. Build custom automations for businesses. This one has the highest value per hour — but also the steepest learning curve.

In this course, we're going to cover all five. By Module 3, you'll know which one is right for you. Let's go.`
  },
  {
    module: 1, lesson: 3,
    title: 'Your AI Tool Stack',
    script: `You don't need twenty AI tools. You need five. Here's the exact stack I use.

First: ChatGPT or Claude for writing, research, and strategy. This is your thinking partner. Second: Midjourney or DALL-E for image generation. Every product, every brand, every visual asset.

Third: ElevenLabs for voice cloning. Turn any text into professional audio in seconds. Fourth: Make or Zapier for automation. Connect your tools without writing a single line of code.

Fifth: Notion or Airtable as your AI-powered knowledge base and project manager.

That's it. With these five tools, you can generate content, create products, automate workflows, and serve clients — all within the next 48 hours.

In the next lesson, we get tactical. See you there.`
  },
  {
    module: 2, lesson: 1,
    title: 'Finding Your AI Niche',
    script: `The number one mistake new AI hustlers make is trying to do everything for everyone.

Here's the reality: the riches are in the niches. A generic "AI content writer" earns $500 a month. A "AI email specialist for real estate agents" earns $5,000 a month.

So how do you find YOUR niche? Three questions. One: what industry do you already know? Your background is an asset, not a liability. Two: what problem are businesses in that industry paying to solve right now? Three: can AI solve that problem faster or better than the current solution?

If you can answer yes to all three, you have a niche.

In the next lesson, I'll show you the exact process to validate your niche before you spend a single hour building.`
  },
  {
    module: 2, lesson: 2,
    title: 'Validating Your Niche in 24 Hours',
    script: `Validation is the step most people skip. And it's why most people fail.

Here's my 24-hour validation process. Step one: go to LinkedIn and search for your target client. If you want to serve real estate agents, search "real estate agent" and look at their profiles. What services are they buying? What problems are they posting about?

Step two: search Reddit and Facebook groups in your niche. Look for posts that start with "I'm struggling with..." or "Does anyone know how to...". These are your product ideas.

Step three: post a simple question in those groups. "Hey, I'm building an AI tool to help with [problem]. Would that be useful to you?" If you get ten positive responses in 24 hours, you have a validated niche.

This takes one day. Do it before you build anything else.`
  },
  {
    module: 3, lesson: 1,
    title: 'Your First AI Service Offer',
    script: `Today we're building your first offer. Not a business plan. Not a brand. An offer.

An offer is simple: I do this specific thing, for this specific person, and it costs this much. That's it.

Here's the formula I use. Service plus niche plus outcome equals offer. For example: "AI-powered social media content" plus "for fitness coaches" plus "that grows your following by 500 followers in 30 days". 

That's your offer.

Notice how specific it is. Not "social media help". Not "AI services". A specific transformation for a specific person.

Your homework for today: write your offer using this formula. Keep it to one sentence. Then say it out loud. If it sounds clear and valuable, you're ready for the next step. If it sounds vague, narrow it down.

We build your outreach system in the next lesson.`
  },
  {
    module: 3, lesson: 2,
    title: 'Landing Your First Client',
    script: `Let's get you a client today.

I'm not joking. With the right script and the right platform, you can have a paying client within 24 hours of finishing this lesson.

Here's the process. Step one: go to LinkedIn. Step two: search for your target client — use the niche you defined in Module 2. Step three: filter to second connections and send this message.

"Hey [name], I noticed you're a [niche]. I've been building AI systems that help [niche] achieve [outcome]. I just finished one for a client that resulted in [result]. Would you be open to a quick 15-minute call to see if it could work for you?"

That's it. No selling. No pitching. Just curiosity.

Send 10 of these per day. At a 20 percent response rate, that's two calls per day. At a 30 percent close rate, that's three clients per week.

Start today.`
  }
];

function generateVideo(lesson) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      video_inputs: [{
        character: { type: 'avatar', avatar_id: AVATAR_ID, avatar_style: 'normal' },
        voice: { type: 'text', input_text: lesson.script, voice_id: VOICE_ID },
        background: { type: 'color', value: '#1a1a2e' }
      }],
      dimension: { width: 1920, height: 1080 },
      title: `AI Hustle Engine - M${lesson.module}L${lesson.lesson} - ${lesson.title}`
    });

    const req = https.request({
      hostname: 'api.heygen.com',
      path: '/v2/video/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': HEYGEN_API_KEY
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.data && json.data.video_id) {
            resolve({ ...lesson, video_id: json.data.video_id });
          } else {
            reject(new Error(`API error: ${data}`));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function generateAllVideos() {
  const results = [];
  console.log(`Generating ${LESSONS.length} videos...\n`);

  for (const lesson of LESSONS) {
    try {
      console.log(`Generating M${lesson.module}L${lesson.lesson}: ${lesson.title}...`);
      const result = await generateVideo(lesson);
      results.push(result);
      console.log(`  ✅ Video ID: ${result.video_id}`);
      // Brief pause between API calls
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  ❌ Failed M${lesson.module}L${lesson.lesson}:`, err.message);
      results.push({ ...lesson, error: err.message });
    }
  }

  // Save results
  fs.writeFileSync('/home/clawd/clawd/projects/ai-hustle-website/video-jobs.json', JSON.stringify(results, null, 2));
  console.log('\n📝 Job IDs saved to video-jobs.json');
  console.log('\nSummary:');
  results.forEach(r => {
    if (r.video_id) console.log(`  ✅ M${r.module}L${r.lesson}: ${r.video_id}`);
    else console.log(`  ❌ M${r.module}L${r.lesson}: ${r.error}`);
  });
}

generateAllVideos();
