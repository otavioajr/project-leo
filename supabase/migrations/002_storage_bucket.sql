-- Create images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);

-- Storage policies
CREATE POLICY "images_select" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images' AND is_admin());
CREATE POLICY "images_update" ON storage.objects FOR UPDATE USING (bucket_id = 'images' AND is_admin());
CREATE POLICY "images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'images' AND is_admin());
