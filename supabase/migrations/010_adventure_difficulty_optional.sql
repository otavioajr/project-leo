-- Dificuldade opcional e texto livre (sem enum no banco)
ALTER TABLE adventures
  ALTER COLUMN difficulty DROP NOT NULL,
  ALTER COLUMN difficulty DROP DEFAULT;
