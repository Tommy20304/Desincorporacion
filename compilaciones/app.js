import express from 'express';
import cors from 'cors';
import router from "./router/ingresarDatos.js";
import buscar from './router/buscarDatos.js';
import usuario from './router/usuarios.js';
import plantilla from './router/plantillas.js';
import actualizar from './router/actualizar.js';
import eliminar from './router/eliminar.js';
import manipular from './router/manipularDatos.js';
import crearClave from './router/crearClaveCaja.js';
import 'dotenv/config'; //para cargar las variables de entorno desde un archivo .env
let app = express();
const port = process.env.PORT || "3000";
console.log(`Puerto: ${process.env.PORT}`);
// Esto hace que todo lo que esté en la carpeta 'imagenes planillas' sea accesible vía URL
app.use('/imagenes', express.static('src/imagenes plantillas'));
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.raw({ type: 'application/json' }));
app.use("/ingresar", router);
app.use("/buscar", buscar);
app.use("/usuario", usuario);
app.use("/plantilla", plantilla);
app.use("/actualizar", actualizar);
app.use("/eliminar", eliminar);
app.use("/manipular", manipular);
app.use("/crear-clave", crearClave);
// Inicia el servidor
app.listen(port, () => {
    console.log(`Aplicación escuchando en http://localhost:${port}`);
});
//# sourceMappingURL=app.js.map