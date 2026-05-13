-- Optional image attachment for direct_messages (caption remains in body)

ALTER TABLE direct_messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;
