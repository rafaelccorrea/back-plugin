/**
 * Inspeciona o banco Supabase: lista tabelas e estrutura.
 * Uso: node scripts/db-inspect.mjs
 */
import "dotenv/config";
import pg from "pg";
const { Client } = pg;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Defina DIRECT_URL ou DATABASE_URL no .env");
  process.exit(1);
}

const client = new Client({ connectionString });

async function main() {
  try {
    await client.connect();
    console.log("--- TABELAS NO SCHEMA public ---\n");

    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log("Tabelas:", tables.rows.map((r) => r.table_name).join(", ") || "(nenhuma)");
    console.log("");

    for (const row of tables.rows) {
      const name = row.table_name;
      const cols = await client.query(
        `SELECT column_name, data_type, is_nullable 
         FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 
         ORDER BY ordinal_position`,
        [name]
      );
      console.log(`\n=== ${name} (${cols.rows.length} colunas) ===`);
      cols.rows.forEach((c) => console.log(`  ${c.column_name}: ${c.data_type} ${c.is_nullable === "NO" ? "NOT NULL" : ""}`));

      const count = await client.query(`SELECT COUNT(*) FROM "${name}"`).catch(() => ({ rows: [{ count: "erro" }] }));
      console.log(`  -> registros: ${count.rows[0]?.count ?? "?"}`);
    }

    console.log("\n--- ENUMS ---\n");
    const enums = await client.query(`
      SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) as labels
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `);
    enums.rows.forEach((r) => console.log(`${r.typname}: [${Array.isArray(r.labels) ? r.labels.join(", ") : r.labels}]`));
  } catch (err) {
    console.error("Erro:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
