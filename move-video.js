const { google } = require('googleapis');
const fs = require('fs');

const CREDENTIALS_PATH = '/home/clawd/.clawdbot/credentials/google/credentials.json';
const TOKEN_PATH = '/home/clawd/.clawdbot/credentials/google/token.json';

async function findAndMoveVideo() {
  try {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);
    
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    
    // Search for the video file
    console.log('Searching for video file...');
    const res = await drive.files.list({
      q: "name='Module1_Lesson1_AI_Opportunity.mp4'",
      fields: 'files(id, name, parents, webViewLink)'
    });
    
    if (res.data.files.length === 0) {
      console.log('Video not found!');
      return;
    }
    
    const video = res.data.files[0];
    console.log('Found video:');
    console.log('  File ID:', video.id);
    console.log('  Current parents:', video.parents);
    console.log('  Link:', video.webViewLink);
    
    // List all folders to find AdvancedMedias
    console.log('\nSearching for AdvancedMedias folder...');
    const folderRes = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)'
    });
    
    const advancedMediasFolder = folderRes.data.files.find(f => 
      f.name.toLowerCase().includes('advanced') || f.name.toLowerCase().includes('advancedmedias')
    );
    
    if (advancedMediasFolder) {
      console.log('Found AdvancedMedias folder:', advancedMediasFolder.id);
      
      // Move the file to the correct folder
      console.log('Moving video to AdvancedMedias folder...');
      await drive.files.update({
        fileId: video.id,
        addParents: advancedMediasFolder.id,
        removeParents: video.parents.join(',')
      });
      
      console.log('✅ Video moved successfully to AdvancedMedias folder!');
    } else {
      console.log('AdvancedMedias folder not found. Available folders:');
      folderRes.data.files.forEach(f => console.log('  -', f.name, '(', f.id, ')'));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findAndMoveVideo();
