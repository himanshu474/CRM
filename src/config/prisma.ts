import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Initialize client with the adapter
const prisma = new PrismaClient({ adapter });


console.log("DATABASE_URL:", process.env.DATABASE_URL);


export default prisma;
