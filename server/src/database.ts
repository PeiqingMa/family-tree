import knex, { Knex } from 'knex';
import path from 'path';

let db: Knex;

export function getDb(): Knex {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function initializeDatabase(dbPath?: string): Promise<Knex> {
  const filename = dbPath || path.join(__dirname, '..', 'data', 'family-tree.db');

  db = knex({
    client: 'better-sqlite3',
    connection: {
      filename,
    },
    useNullAsDefault: true,
  });

  await createTables(db);
  return db;
}

async function createTables(db: Knex): Promise<void> {
  const hasPersons = await db.schema.hasTable('persons');
  if (!hasPersons) {
    await db.schema.createTable('persons', (table) => {
      table.text('id').primary();
      table.text('bio_gender');
      table.text('social_gender');
      table.text('life_from');
      table.text('life_end');
      table.text('birth_place');
      table.text('death_place');
      table.text('details');
      table.text('photos'); // JSON array
      table.text('created_at');
      table.text('updated_at');
    });
  }

  const hasPersonNames = await db.schema.hasTable('person_names');
  if (!hasPersonNames) {
    await db.schema.createTable('person_names', (table) => {
      table.text('id').primary();
      table.text('person_id').notNullable().references('id').inTable('persons').onDelete('CASCADE');
      table.text('family_name');
      table.text('given_name');
      table.text('middle_name');
      table.text('full_name');
      table.text('name_type');
      table.text('name_order').defaultTo('FamilyNameFirst');
    });
  }

  const hasRelations = await db.schema.hasTable('relations');
  if (!hasRelations) {
    await db.schema.createTable('relations', (table) => {
      table.text('id').primary();
      table.text('from_person_id').notNullable().references('id').inTable('persons').onDelete('CASCADE');
      table.text('to_person_id').notNullable().references('id').inTable('persons').onDelete('CASCADE');
      table.text('relation_type').notNullable(); // parent, child, spouse
      table.text('sub_type');
      table.text('spouse_from');
      table.text('spouse_end');
      table.text('created_at');
    });
  }
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
  }
}
