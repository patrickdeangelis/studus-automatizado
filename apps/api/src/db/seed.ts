import { db } from '../db';
import { users } from './schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Creating admin user...');

  // Verificar se usuário admin já existe
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, 'admin'))
    .limit(1);

  if (existing.length === 0) {
    // Criar usuário admin
    await db.insert(users).values({
      id: 1,
      username: 'admin',
      password: 'admin123', // Em produção: usar bcrypt.hash()
      studusUsername: null,
      studusPassword: null,
      encrypted: false,
      cookies: null
    });

    console.log('✅ Admin user created successfully');
    console.log('   Username: admin');
    console.log('   Password: admin123');
  } else {
    console.log('✅ Admin user already exists');
  }

  console.log('Seed completed!');
}

// Executar seed
seed().catch(console.error);