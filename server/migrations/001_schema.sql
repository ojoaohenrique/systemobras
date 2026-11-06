-- Gestão de Obra – Borderô · schema inicial

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  perfil        TEXT NOT NULL CHECK (perfil IN ('admin','financeiro','engenharia','leitura')),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_login  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessoes (
  token_hash  TEXT PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessoes_usuario_idx ON sessoes(usuario_id);

CREATE TABLE IF NOT EXISTS empreendimentos (
  codigo  TEXT PRIMARY KEY,          -- CB1, CB2, CB12 (compartilhado)
  nome    TEXT NOT NULL
);

-- Lançamentos: borderô (B), folha / custo fixo (F) e compra de equipamentos (E)
CREATE TABLE IF NOT EXISTS lancamentos (
  id             TEXT PRIMARY KEY,
  seq            BIGSERIAL,          -- ordem de inclusão (a tela depende dela)
  origem         CHAR(1) NOT NULL CHECK (origem IN ('B','F','E')),
  competencia    CHAR(7) NOT NULL CHECK (competencia ~ '^\d{4}-\d{2}$'),
  data           TEXT,               -- AAAA-MM-DD (texto para aceitar o que a planilha traz)
  quinzena       TEXT,               -- folha: '1', '2' ou 'M'
  fornecedor     TEXT NOT NULL DEFAULT '',
  documento      TEXT NOT NULL DEFAULT '',   -- CNPJ / CPF / chave PIX
  valor          NUMERIC(14,2),
  salario        NUMERIC(14,2),      -- folha
  observacao     TEXT NOT NULL DEFAULT '',
  item           TEXT NOT NULL DEFAULT '',
  tipo           TEXT,               -- MAT, MDO, MAQ
  informal       BOOLEAN,            -- folha: pagamento informal
  diluir         BOOLEAN NOT NULL DEFAULT FALSE,  -- equipamento diluído em 9 meses
  criado_por     INTEGER REFERENCES usuarios(id),
  atualizado_por INTEGER REFERENCES usuarios(id),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lanc_comp_idx ON lancamentos(competencia);
CREATE INDEX IF NOT EXISTS lanc_origem_idx ON lancamentos(origem);

-- Orçamento por empreendimento e item (valores por tipo)
CREATE TABLE IF NOT EXISTS orcamento (
  empreendimento TEXT NOT NULL REFERENCES empreendimentos(codigo),
  item           TEXT NOT NULL,
  ordem          INTEGER NOT NULL,
  maq            NUMERIC(14,2) NOT NULL DEFAULT 0,
  mat            NUMERIC(14,2) NOT NULL DEFAULT 0,
  mdo            NUMERIC(14,2) NOT NULL DEFAULT 0,
  sem_tipo       NUMERIC(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (empreendimento, item)
);

-- Cronograma planejado: % do orçamento do item em cada mês
CREATE TABLE IF NOT EXISTS cronograma_planejado (
  item        TEXT NOT NULL,
  competencia CHAR(7) NOT NULL,
  percentual  NUMERIC(12,9) NOT NULL,
  PRIMARY KEY (item, competencia)
);

-- Configurações gerais (ex.: áreas loteáveis)
CREATE TABLE IF NOT EXISTS configuracoes (
  chave         TEXT PRIMARY KEY,
  valor         JSONB NOT NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auditoria: quem mudou o quê
CREATE TABLE IF NOT EXISTS auditoria (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id),
  acao        TEXT NOT NULL,          -- criar, editar, excluir, importar, login...
  tabela      TEXT,
  registro_id TEXT,
  antes       JSONB,
  depois      JSONB,
  em          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_em_idx ON auditoria(em DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  versao   TEXT PRIMARY KEY,
  aplicada TIMESTAMPTZ NOT NULL DEFAULT now()
);
