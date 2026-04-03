import express from 'express';
import pool from "../database/conexionDatabase.js"; //se importa la conexion a la base de datos
import BuscarDatos from './logicaRouter/buscarDatos/Busqueda.js';
import verificarToken from '../token/comprobarToken.js';
import multer from "multer";
import xlsx from "xlsx";
import sinonimos from './logicaRouter/ingresarDatos/sinonimos.js';
import { BuscarIdentificadores } from './logicaRouter/buscarDatos/AnalizarArchivo.js';

const buscar = express.Router();

// Configuración de almacenamiento de Multer
const storage = multer.memoryStorage();
const cargar = multer({ storage: storage });

buscar.get("/bloque-busqueda", verificarToken, async (req, res) => {
    //se retorna la informacion de todas las tablas

    let tablasDosColumnas:any = ["categoria", "marca", "modelo", "ubicaciones"]; //tablas con solo dos columnas
    
    //se almacena la informacion de las tablas con dos columnas
    let datos = {}
    for(let column of tablasDosColumnas){
        datos[column] = await pool.query("SELECT * FROM " + column)
    }
    
    //consultas para tablas que tienen mas de dos columas
    datos["usuario"] = await pool.query("SELECT cedula, nombre_usuario, cargo FROM usuarios WHERE estado = 'activado'");
    datos["componente"] = ["cpu", "ram", "pantalla", "carcasa", "disco duro", "tarjeta madre", "fan cooler", "fuente de poder"];
    
    res.json({ datos: datos }); 
});
buscar.post("/buscar-datos", verificarToken, async (req, res) => {
    //se hace la busqueda de los datos
    try {
        let buscar = new BuscarDatos(req.body);
        await buscar.buscar();
        res.json({ consulta: buscar.resultadoBusqueda });
    }
    catch (e) {
        console.log(e);
        res.json({ consulta: false });
    }
});

buscar.post("/buscar-deshabilitado", verificarToken, async (req, res) => {
    //se busca los activos desincorporados
    try {
        let buscar = new BuscarDatos(req.body.datos);
        await buscar.buscar(true);
        res.json({ consulta: buscar.resultadoBusqueda });
    }
    catch (e) {
        console.log(e);
        res.json({ consulta: false });
    }
});

buscar.post("/archivo", verificarToken, cargar.single("fileExcel"), async (req:any, res) => {
    //se procea la busqueda por archivo
    try {

        //si no hay ningun archivo
        if (!req.file) { 
            return res.json({ mensaje: false });
        }

        //se extrae los datos del archivo
        const libro = xlsx.read(req.file.buffer, { type: 'buffer' }); 
        const nombreHoja = libro.SheetNames[0]; 
        const hoja = libro.Sheets[nombreHoja]; 
        const datos = xlsx.utils.sheet_to_json(hoja); 
        
        //se retorna los sinonimos de las columnas de los identificadores en un mismo array
        const arraySinonimos = Object.entries(sinonimos.sinonimosColumnas()).reduce((acc, [clave, valor]) => {
            if(["serial", "etiqueta", "mac_addre"].includes(clave)){
                valor.forEach(item => acc.push(item));
            }
            return acc;
        }, [])

        //se hace la busqueda
        let resultado = new BuscarIdentificadores(datos, arraySinonimos);
        await resultado.buscar(req.body.activarDeshabilitado);

        //determina si no se encontro un dato
        if (resultado.datosObtenidos.length == 0) {
            return res.json({ mensaje: 'no se encontro ningun dato' });
        }

        //determina si hay registros repetidos
        if (resultado.registrosRepetidos.length > 0) {
            return res.json({ mensaje: 'registros repetidos', resultado: resultado });
        }

        //determina si hay filas no encontradas
        if (resultado.filasNoObtenidas.length > 0) {
            return res.json({ mensaje: 'filas no encontradas', resultado: resultado });
        }
        
        res.json({ mensaje: 'se encontro todos los datos', resultado: resultado });
    }
    catch (e) {
        console.log(e);
        return res.json({ mensaje: false });
    }
});
buscar.post("/cargo-usuario", verificarToken, async (req, res) => {
    try{
        let consulta = "SELECT cargo From usuarios WHERE nombre_usuario = "+req.body.nombre;
        let result = await pool.query(consulta);
        res.json({mensaje: true, resultado: result});
    }catch(e){
        res.json({mensaje: true});
    }
});
export default buscar;
//# sourceMappingURL=buscarDatos.js.map