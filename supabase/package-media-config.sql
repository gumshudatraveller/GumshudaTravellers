-- Reapply bucket file types without changing owner-only upload policies.
update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf','video/mp4']
where id = 'package-media';
