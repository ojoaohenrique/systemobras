// Popula o banco com os dados que estavam dentro do HTML antigo.
// Uso: npm run seed            (só insere lançamentos se a tabela estiver vazia)
//      npm run seed -- --forcar (apaga os lançamentos e recarrega do HTML)
const { pool, tx } = require("../db");
const { lerLegado } = require("./legado");
const { validar, upsert, auditar } = require("../repo");

const NOMES = { CB1: "Campo Belo I", CB2: "Campo Belo II", CB12: "Campo Belo I + II (compartilhado)" };

async function seed() {
  const forcar = process.argv.includes("--forcar");
  const L = lerLegado();
  await tx(async (c) => {
    for (const [k, n] of Object.entries(NOMES))
      await c.query("INSERT INTO empreendimentos(codigo,nome) VALUES ($1,$2) ON CONFLICT (codigo) DO UPDATE SET nome=EXCLUDED.nome", [k, n]);

    for (const emp of Object.keys(L.orc)) {
      let i = 0;
      for (const [item, maq, mat, mdo, sem] of L.orc[emp]) {
        await c.query(
          `INSERT INTO orcamento(empreendimento,item,ordem,maq,mat,mdo,sem_tipo) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (empreendimento,item) DO UPDATE SET ordem=EXCLUDED.ordem,maq=EXCLUDED.maq,mat=EXCLUDED.mat,mdo=EXCLUDED.mdo,sem_tipo=EXCLUDED.sem_tipo`,
          [emp, item, i++, maq, mat, mdo, sem],
        );
      }
    }

    for (const [item, arr] of Object.entries(L.cmp))
      for (let i = 0; i < arr.length; i++)
        await c.query(
          `INSERT INTO cronograma_planejado(item,competencia,percentual) VALUES ($1,$2,$3)
           ON CONFLICT (item,competencia) DO UPDATE SET percentual=EXCLUDED.percentual`,
          [item, L.pm[i], arr[i]],
        );

    await c.query(`INSERT INTO configuracoes(chave,valor) VALUES ('areas','{"l1":0,"l2":0}') ON CONFLICT (chave) DO NOTHING`);

    const { rows } = await c.query("SELECT count(*)::int n FROM lancamentos");
    if (rows[0].n > 0 && !forcar) {
      console.log(`Lançamentos já existem (${rows[0].n}). Nada alterado. Use --forcar para recarregar do HTML.`);
      return;
    }
    if (forcar) await c.query("DELETE FROM lancamentos");
    for (const r of L.rows) await upsert(c, validar(r), null);
    await auditar(c, null, "seed", "lancamentos", null, null, { quantidade: L.rows.length });
    console.log(`${L.rows.length} lançamentos carregados do HTML antigo.`);
  });
  console.log("Orçamento, cronograma planejado e empreendimentos atualizados.");
}

seed()
  .catch((e) => {
    console.error(require("../db").explicarErro(e));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
