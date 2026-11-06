-- Bloqueia o acesso direto às tabelas pela API pública do Supabase (PostgREST).
-- O sistema acessa o banco só pelo servidor, com o usuário dono das tabelas,
-- que não é afetado pelo RLS. Sem nenhuma política, os papéis "anon" e
-- "authenticated" do Supabase não conseguem ler nem gravar nada.
-- Em um PostgreSQL comum (sem Supabase) isso não muda nada.

ALTER TABLE usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE empreendimentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma_planejado ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria            ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
    END IF;
  END LOOP;
END $$;
