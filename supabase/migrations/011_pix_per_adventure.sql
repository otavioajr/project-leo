-- PIX por aventura: cada aventura guarda sua própria configuração de PIX
-- (códigos copia-e-cola por tamanho de grupo, toggle de ativação e instruções)
-- em uma coluna JSONB, espelhando o tipo PixConfig do app.
ALTER TABLE adventures
  ADD COLUMN pix_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Config global de PIX não é mais usada (decisão: começar vazio; o admin
-- recadastra os códigos em cada aventura).
DELETE FROM content WHERE id = 'pix';
