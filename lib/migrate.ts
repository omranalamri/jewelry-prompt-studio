import { neon } from '@neondatabase/serverless';

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);

  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      module TEXT NOT NULL CHECK (module IN ('analyze', 'concept', 'vision')),
      title TEXT,
      input_context TEXT,
      output_type TEXT,
      image_urls TEXT[] DEFAULT '{}',
      result JSONB NOT NULL,
      is_saved BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS concept_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      result_json JSONB,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS saved_prompts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
      platform TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      label TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;

  // Create indexes if they don't exist
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_module ON sessions(module)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC)`;

  console.log('Migration complete!');
}

migrate().catch(console.error);
