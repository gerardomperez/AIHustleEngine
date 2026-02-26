#!/bin/bash
# Poll for video completion and download

VIDEO_ID="51176ec1732f4e92abdbe9135c777b20"
API_KEY="sk_V2_hgu_kDsRDfBP6UV_vbJUnpMueHcQP4IKF6PP3n99TtIXgErA"
OUTPUT_PATH="/home/clawd/clawd/projects/ai-hustle-website/Module1_Lesson1_AI_Opportunity.mp4"

echo "⏳ Checking video status every 30 seconds..."

while true; do
  RESPONSE=$(curl -s "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" -H "X-Api-Key: $API_KEY")
  STATUS=$(echo $RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  VIDEO_URL=$(echo $RESPONSE | grep -o '"video_url":"[^"]*"' | cut -d'"' -f4)
  
  echo "Status: $STATUS"
  
  if [ "$STATUS" = "completed" ] && [ -n "$VIDEO_URL" ]; then
    echo "✅ Video ready! Downloading..."
    curl -L "$VIDEO_URL" -o "$OUTPUT_PATH"
    echo "✅ Downloaded to: $OUTPUT_PATH"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Video generation failed"
    echo "Response: $RESPONSE"
    exit 1
  fi
  
  sleep 30
done
