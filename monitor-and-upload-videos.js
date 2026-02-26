/**
 * Monitor HeyGen video jobs and auto-download + upload to Google Drive
 * Reads job IDs from video-jobs.json + the original M1L1 video
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const HEYGEN_API_KEY = 'sk_V2_hgu_kDsRDfBP6UV_vbJUnpMueHcQP4IKF6PP3n99TtIXgErA';
const CREDENTIALS_PATH = '/home/clawd/.clawdbot/credentials/google/credentials.json';
const TOKEN_PATH = '/home/clawd/.clawdbot/credentials/google/token.json';
const ADVANCED_MEDIAS_FOLDER = '1T2bqhAxzhEbPSF-UrmCR-ru6mET_l3iD';
const VIDEO_DIR = '/home/clawd/clawd/projects/ai-hustle-website/videos';
const JOBS_FILE = '/home/clawd/clawd/projects/ai-hustle-website/video-jobs.json';

// All jobs including M1L1
const ALL_JOBS = [
  { module: 1, lesson: 1, title: 'The AI Opportunity', video_id: '2671272966ff478bb9494d70b1c984d5' },
  ...JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'))
];

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

function checkVideoStatus(videoId) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.heygen.com',
      path: `/v1/video_status.get?video_id=${videoId}`,
      method: 'GET',
      headers: { 'X-Api-Key': HEYGEN_API_KEY }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function uploadToDrive(filePath, fileName) {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.web;
  const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  auth.setCredentials(token);
  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.create({
    resource: { name: fileName, parents: [ADVANCED_MEDIAS_FOLDER] },
    media: { mimeType: 'video/mp4', body: fs.createReadStream(filePath) },
    fields: 'id, name, webViewLink'
  });
  return res.data;
}

async function monitorAll() {
  const pending = [...ALL_JOBS.filter(j => j.video_id && !j.error)];
  const done = new Set();
  const failed = new Set();
  const results = [];

  console.log(`Monitoring ${pending.length} videos...`);

  while (done.size + failed.size < pending.length) {
    for (const job of pending) {
      if (done.has(job.video_id) || failed.has(job.video_id)) continue;

      const status = await checkVideoStatus(job.video_id);
      const s = status.data?.status;

      if (s === 'completed' && status.data?.video_url) {
        const filename = `M${job.module}L${job.lesson}_${job.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
        const localPath = path.join(VIDEO_DIR, filename);

        console.log(`\n✅ M${job.module}L${job.lesson} ready — downloading...`);
        await downloadFile(status.data.video_url, localPath);
        console.log(`   Downloaded: ${localPath}`);

        console.log(`   Uploading to Google Drive...`);
        const driveFile = await uploadToDrive(localPath, filename);
        console.log(`   Uploaded: ${driveFile.webViewLink}`);

        done.add(job.video_id);
        results.push({ ...job, localPath, driveFileId: driveFile.id, driveLink: driveFile.webViewLink });
      } else if (s === 'failed') {
        console.log(`\n❌ M${job.module}L${job.lesson} failed`);
        failed.add(job.video_id);
      } else {
        process.stdout.write('.');
      }
    }

    if (done.size + failed.size < pending.length) {
      await new Promise(r => setTimeout(r, 30000)); // check every 30s
    }
  }

  // Save results
  const summary = {
    completedAt: new Date().toISOString(),
    videos: results,
    failed: pending.filter(j => failed.has(j.video_id))
  };
  fs.writeFileSync('/home/clawd/clawd/projects/ai-hustle-website/video-results.json', JSON.stringify(summary, null, 2));

  console.log(`\n\n🎉 Done! ${done.size} videos uploaded, ${failed.size} failed`);
  results.forEach(r => console.log(`  M${r.module}L${r.lesson}: ${r.driveLink}`));
}

monitorAll().catch(err => {
  console.error('Monitor error:', err.message);
  process.exit(1);
});
