import express from 'express';
import pool from "../database/conexionDatabase.js"; //se importa la conexion a la base de datos
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import verificarToken from '../token/comprobarToken.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv'; //para cargar las variables de entorno desde un archivo .env

// Obtener la ruta de la carpeta actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../configuracion.env') });

const usuario = express.Router();

//clave por el cual se firma los tokens
let claveSecreta = process.env.JWT_SECRET;

usuario.post("/registrar", verificarToken, async (req, res) => {
    try {
        let { username, documento, password, cargo } = req.body;

        //consultas para verificar los datos
        let verificar = await pool.query(`SELECT cedula, nombre_usuario, cargo FROM usuarios WHERE cedula = ${documento}`);
        let verificarNombre = await pool.query(`SELECT cedula, nombre_usuario, cargo FROM usuarios WHERE nombre_usuario = '${username}'`);

        //se verifica si ya existe la cedula
        if (verificar.rows.length > 0) {
            res.json({ mensaje: "cedula ya existente" });
            return;
        }

        //se verifica si ya exite el nombre de usuario
        if (verificarNombre.rows.length > 0) {
            res.json({ mensaje: "nombre ya existente" });
            return;
        }
        // El 'salt' es una capa aleatoria de seguridad, es decir es un bloque random que se añade a la contraseña
        let salt = await bcrypt.genSalt(10);
        let combinacion = await bcrypt.hash(password, salt); //se combina la contraseña original con los caracteres randoms
        
        //esto da como resultado la contraseña incriptada
        
        //se guarda en la base de datos
        let insertar = `INSERT INTO usuarios (cedula, nombre_usuario, password, cargo, estado) VALUES ($1,$2,$3,$4, $5)`;
        await pool.query(insertar, [Number(documento), username, combinacion, cargo, 'activado']);
        
        return res.json({ respuesta: "se realizo el registro" });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: "hubo errores en el registro" });
    }
});

usuario.post("/acceder", async (req, res) => {
    try {
        let { cedula, password } = req.body;

        //*se busca el usuario en la base de datos*
        let buscar = await pool.query(`SELECT cedula, nombre_usuario, cargo, password, estado FROM usuarios WHERE cedula = ${cedula}`);

        //si no existe, la cedula no es valida
        if (buscar.rows == 0) {
            res.json({ mensaje: "cedula no valida" });
            return;
        }

        //la contraseña correspondiente al usuario
        let contraseñaEncriptada = buscar.rows[0].password;

        //comporar la contraseña encriptada con la ingresada
        let verificar = await bcrypt.compare(password, contraseñaEncriptada);
        if (!verificar) {
            return res.json({ mensaje: "contraseña no valida" });
        }

        //se comprueba que el usuario no este desactivado
        if (buscar.rows[0].estado === 'desactivado'){
            res.json({ mensaje: "usuario desactivado" });
            return;
        }

        //si todo paso, se crea el token
        const token = jwt.sign({ id: cedula, usuario: buscar.rows[0].nombre_usuario }, claveSecreta);
        
        //se envia el token
        return res.json({
            mensaje: "se creo el token", 
            token: token, 
            informacion: { 
                nombre: buscar.rows[0].nombre_usuario,
                cargo: buscar.rows[0].cargo, 
                cedula: cedula } 
            }); 
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: "hubo un error" });
    }
});

usuario.post("/ver-historial", verificarToken, async (req, res) => {
    //retorna el historia de claves del usuario
    try{
        //se hace la consulta
        let result = await pool.query("SELECT clave_masiva, fecha_registro FROM equipos WHERE id_usuario = "+req.body.cedula);

        //filtramos las claves nulas
        let resultadoCompleto = result.rows.filter(fila => fila.clave_masiva); 
        
        //se filtra las claves repetidas
        let resultadoFinal = resultadoCompleto.reduce((acc, row) => {
            acc[row.clave_masiva] = row
            return acc;
        }, {});

        res.json({mensaje:true, datos: Object.values(resultadoFinal)});
    }catch(e){
        console.log(e);
        res.json({mensaje:false});
    }
})

usuario.get("/ver-datos", verificarToken, async (req, res) => {

    const resultado = await pool.query("SELECT * FROM usuarios WHERE estado = 'activado'");

    res.json({mensaje: true, datos: resultado.rows});
})

usuario.get("/ver-datos-desactivado", verificarToken, async (req, res) => {

    const resultado = await pool.query("SELECT * FROM usuarios WHERE estado = 'desactivado'");

    res.json({mensaje: true, datos: resultado.rows});
})

usuario.post("/agregar-administrador", verificarToken, async (req:any, res) => {
    //se añade el administrador
    try{
        await pool.query("UPDATE usuarios SET cargo = 'administrador' WHERE cedula = "+req.body.cedula);
        res.json({mensaje:true});
    }catch(e){
        console.log(e);
        res.json({mensaje: false});
    }
})

usuario.post("/quitar-administrador", verificarToken, async (req:any, res) => {
    //se actualiza el cargo de administrador por el de trabajador
    try{
        await pool.query("UPDATE usuarios SET cargo = 'trabajador' WHERE cedula = "+req.body.cedula);
        res.json({mensaje:true});
    }catch(e){
        console.log(e);
        res.json({mensaje: false});
    }
})

usuario.post("/activar-usuario", verificarToken, async (req:any, res) => {
    //se activa el usuario
    try{
        await pool.query("UPDATE usuarios SET estado = 'activado' WHERE cedula = "+req.body.cedula);
        res.json({mensaje:true});
    }catch(e){
        console.log(e);
        res.json({mensaje: false});
    }
})

usuario.post("/desactivar-usuario", verificarToken, async (req:any, res) => {
    //se desactiva el usuario
    try{
        await pool.query("UPDATE usuarios SET estado = 'desactivado' WHERE cedula = "+req.body.cedula);
        res.json({mensaje:true});
    }catch(e){
        console.log(e);
        res.json({mensaje: false});
    }
})

usuario.post("/cambiar-password", verificarToken, async (req:any, res) => {
    try{
        const {id, contraseña} = req.body;

        //se encripta la contraseña
        let salt = await bcrypt.genSalt(10);
        const contraseñaEncriptada = await bcrypt.hash(contraseña, salt); 

        //se actualiza
        await pool.query(`UPDATE usuarios SET password = '${contraseñaEncriptada}' WHERE cedula = ${id}`);

        res.json({mensaje: true});
    }catch(e){
        console.log(e);
        res.json({mensaje: false})
    }
})

export default usuario;
//# sourceMappingURL=usuarios.js.map