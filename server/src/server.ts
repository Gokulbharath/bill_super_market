import 'dotenv/config';
import { app } from './app.js';
import { runMigrations } from './database/migrate.js';
import { seedDatabase } from './seed.js';

runMigrations();
seedDatabase();
const PORT = Number(process.env.PORT || 5000);
console.log('Sree Super Market POS Backend');
console.log('Database: SQLite');
console.log('Status: Connected');
console.log(`Port: ${PORT}`);
app.listen(PORT, () => console.log(`Sree Super Market API listening on http://localhost:${PORT}`));
