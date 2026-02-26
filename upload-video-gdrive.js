const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = '/home/clawd/.clawdbot/credentials/google/credentials.json';
const TOKEN_PATH = '/home/clawd/.clawdbot/credentials/google/token.json';
const VIDEO_PATH = '/home/clawd/clawd/projects/ai-hustle-website/Module1_Lesson1_AI_Opportunity.mp4';
const FOLDER_ID = '1rWHgOaRC2PXEa7w8lpU038i7ObRwaFg1'; // AdvancedMedias folder

async function uploadVideo() {
  try {
    // Load credentials
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    
    const { client_secret, client_id, redirect_uris } = credentials.web;
    
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );
    
    oAuth2Client.setCredentials(token);
    
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    
    const fileMetadata = {
      name: 'Module1_Lesson1_AI_Opportunity.mp4',
      parents: [FOLDER_ID]
    };
    
    const media = {
      mimeType: 'video/mp4',
      body: fs.createReadStream(VIDEO_PATH)
    };
    
    console.log('Uploading video to Google Drive...');
    
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });
    
    console.log('✅ Upload successful!');
    console.log('File ID:', file.data.id);
    console.log('View Link:', file.data.webViewLink);
    
    return file.data;
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    if (error.message.includes('invalid_grant')) {
      console.log('\nToken may be expired. Need to re-authenticate.');
    }
    throw error;
  }
}

uploadVideo();
