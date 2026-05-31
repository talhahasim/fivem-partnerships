-- =============================================================================
-- announce_target enum'una 'own' değeri ekle.
-- 'own' = partnerlere gönderme yok, yalnız mağazanın kendi kanallarına gönderim.
-- =============================================================================
alter type announce_target add value if not exists 'own';
