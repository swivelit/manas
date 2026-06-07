-- Add optional per-video mascot briefing text and audio.
ALTER TABLE "Video"
ADD COLUMN "toyDescription" TEXT,
ADD COLUMN "toyAudioUrl" TEXT;
