const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const { pool } = require("./pool");
const { saveTemplate } = require("../services/checklistService");

async function upsertRole(name, permissions) {
  await pool.query(
    `INSERT INTO roles (id, name, permissions) VALUES ($1,$2,$3)
     ON DUPLICATE KEY UPDATE permissions=VALUES(permissions)`,
    [randomUUID(), name, JSON.stringify(permissions)]
  );
  const { rows } = await pool.query("SELECT * FROM roles WHERE name=$1", [name]);
  return rows[0];
}

async function seed() {
  const adminRole = await upsertRole("admin", ["*"]);
  await upsertRole("operador", ["submissions:create", "submissions:finish"]);
  await upsertRole("consultor", ["submissions:read", "vehicles:read"]);
  await upsertRole("gestor", ["dashboard:read", "templates:write", "reports:read"]);

  const passwordHash = await bcrypt.hash("123456", 10);
  await pool.query(
    `INSERT INTO users (id,name,email,password_hash,role_id,store)
     VALUES ($1,'Administrador SIG','admin@sig.com',$2,$3,'Matriz')
     ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role_id=VALUES(role_id)`,
    [randomUUID(), passwordHash, adminRole.id]
  );
  const admin = (await pool.query("SELECT * FROM users WHERE email='admin@sig.com'")).rows[0];

  await pool.query(
    `INSERT INTO vehicles (id,plate,brand,model,version,year,color,mileage,store,status,notes)
     VALUES ($1,'SIG1A23','Toyota','Corolla','XEI',2022,'Branco',42000,'Matriz','Em preparacao','Veiculo exemplo editavel')
     ON DUPLICATE KEY UPDATE plate=plate`,
    [randomUUID()]
  );

  const existing = await pool.query("SELECT id FROM checklist_templates WHERE name='Entrega de veiculo - exemplo editavel'");
  if (!existing.rows[0]) {
    await saveTemplate({
      name: "Entrega de veiculo - exemplo editavel",
      description: "Modelo inicial apenas como exemplo. Todas as categorias e perguntas podem ser editadas pelo painel.",
      active: true,
      categories: [
        {
          title: "Documentacao",
          description: "Conferencia documental configuravel",
          questions: [
            {
              title: "Manual e chave reserva entregues",
              response_type: "sim_nao",
              required: true,
              options: [
                { label: "Sim", value: "sim" },
                { label: "Nao", value: "nao" }
              ]
            },
            {
              title: "Observacoes de documento",
              response_type: "texto_longo",
              allows_observation: true
            }
          ]
        },
        {
          title: "Entrega",
          description: "Itens finais de entrega",
          questions: [
            {
              title: "Veiculo entregue conforme combinado",
              response_type: "conformidade",
              required: true,
              requires_photo: true,
              min_photos: 1,
              observation_required: false,
              options: [
                { label: "Conforme", value: "conforme" },
                { label: "Nao conforme", value: "nao_conforme" },
                { label: "N/A", value: "na" }
              ]
            },
            {
              title: "Assinatura do responsavel",
              response_type: "assinatura",
              required: true
            }
          ]
        }
      ]
    }, admin.id);
  }

  console.log("Seed concluido. Login: admin@sig.com / 123456");
  await pool.end();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
