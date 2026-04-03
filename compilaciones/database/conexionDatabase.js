import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; //para cargar las variables de entorno desde un archivo .env

// Obtener la ruta de la carpeta actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../configuracion.env') });
//const {host, port, database, user, password}: any = JSON.parse(process.env.DATABASE_CONFIG);
const pool = new pg.Pool({
    /*
    host: "localhost",
    port: 5432,
    database: "Desincorporacion_nuevo",
    user: "postgres",
    password: "amoamifamilia"*/
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necesario para que Supabase acepte la conexión segura
    }
});
export default pool;
//# sourceMappingURL=conexionDatabase.js.map
