import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; //para cargar las variables de entorno desde un archivo .env
// Obtener la ruta de la carpeta actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../configuracion.env') });
//esta funcion se encargara de verificar si el token sea valido
function verificarToken(req, res, next) {
    //clave por el cual se firma los tokens
    let claveSecreta = process.env.JWT_SECRET;
    let token = req.headers['authorization'];
    if (!token)
        return res.json({ mensaje: "No hay token" });
    //se verificar el token
    try {
        //Extraer el token si viene como "Bearer [TOKEN]"
        token = token.split(' ')[1];
        const verified = jwt.verify(token, claveSecreta); //se verifica con la clave secreta
        req.user = verified; // Guardamos los datos del usuario en la petición
        next(); // Continuar a la siguiente función
    }
    catch (error) {
        return res.json({ mensaje: "Token no válido" });
    }
}
export default verificarToken;
//# sourceMappingURL=comprobarToken.js.map
//# sourceMappingURL=comprobarToken.js.map