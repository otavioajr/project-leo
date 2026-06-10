-- supabase/migrations/014_image_rights.sql
-- Toggle de direito de imagem por aventura: quando ativo, o formulário
-- público exige aceite de autorização de uso de imagem para inscrever.

ALTER TABLE adventures
  ADD COLUMN image_rights_enabled boolean NOT NULL DEFAULT false;
