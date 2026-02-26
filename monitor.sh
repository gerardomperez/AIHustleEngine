#!/bin/bash
VIDEO_ID="2671272966ff478bb9494d70b1c984d5"
API_KEY="sk_V2_hgu_kDsRDfBP6UV_vbJUnpMueHcQP4IKF6PP3n99TtIXgErA"
OUTPUT="/home/clawd/clawd/projects/ai-hustle-website/Module1_Lesson1_AI_Opportunity.mp4"

echo "Monitoring video: $VIDEO_ID"
for i in {1..20}; do
  RESPONSE=$(curl -s "https://api.heygen.com/v1/video_status.get?video_id=$VIDEO_ID" -H "X-Api-Key: $API_KEY")
  STATUS=$(echo $RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  URL=$(echo $RESPONSE | grep -o '"video_url":"[^"]*"' | cut -d'"' -f4)
  
  echo "$(date): Status = $STATUS"
  
  if [ "$STATUS" = "completed" ] && [ -n "$URL" ]; then
    echo "Downloading to $OUTPUT"
    curl -L "$URL" -o "$OUTPUT"
    echo "✅ Complete: $OUTPUT"
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Failed: $RESPONSE"
    exit 1
  fi
  
  sleep 30
done
echo "Timeout - still processing"
