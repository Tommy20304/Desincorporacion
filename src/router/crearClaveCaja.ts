import express from 'express';
import multer from "multer";
import xlsx from "xlsx";
import pool from "../database/conexionDatabase.js";
import sinonimos from './logicaRouter/ingresarDatos/sinonimos.js';
import verificarToken from '../token/comprobarToken.js';
import { BuscarIdentificadores } from './logicaRouter/buscarDatos/AnalizarArchivo.js';
import { AgregarClave } from './logicaRouter/crearClaveCaja/agregarClave.js';
const crearClave = express.Router();

// Configuración de almacenamiento de Multer
const storage = multer.memoryStorage();
const cargar = multer({ storage: storage });

crearClave.post("/determinar-errores", verificarToken, cargar.single("fileExcel"), async (req:any, res) => {
    //aqui se determinan los errores o incovenientes del archivo, antes de agregar la clave
    try {
        //si no hay ningun archivo
        if (!req.file) { 
            return res.json({ mensaje: false });
        }

        //se extrae los datos
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
        await resultado.buscar();

        //se determinan los errores
        const ubicacionDiferente = AgregarClave.determinarErrorUbicacion(resultado.datosObtenidos);
        const filasClavesExistentes = AgregarClave.determinarClaveExistente(resultado.datosObtenidos);
        const claveExistente = await AgregarClave.determinarClave(req.body.clave);

        //se determina si no se encontro ningun dato
        if (resultado.datosObtenidos.length == 0) {
            return res.json({ mensaje: 'no se encontro ningun dato' });
        }
        
        //se revisa las excepciones en el front-end
        res.json({ mensaje: 'A revision', resultado: resultado, ubicacionDiferente: ubicacionDiferente,
            filasClavesExistentes: filasClavesExistentes, claveExistente: claveExistente
        });

    }
    catch (e) {
        console.log(e);
        return res.json({ mensaje: false });
    }
});
crearClave.post("/agregar", verificarToken, cargar.single("fileExcel"), async (req:any, res) => {
    try {
        const agregar = new AgregarClave(req.body.datos, req.body.clave.trim());
        await agregar.agregarClave();
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});

crearClave.get("/leer-claves", verificarToken, async (req, res) => {
    //se leen todas las claves disponibles

    //se hace la consulta
    let consulta = `SELECT 
    e.clave_caja,
    u.ubicacion_actual AS ubicacion_actual
    FROM equipos e
    INNER JOIN ubicaciones u ON e.id_ubicacion = u.id_ubicacion
    WHERE e.clave_caja IS NOT NULL
    ORDER BY e.clave_caja`
    let result = await pool.query(consulta);

    //se filtra las claves repetidas
    let resultadoFinal = result.rows.reduce((acc, row) => {
        acc[row.clave_caja] = row
        return acc;
    }, {});
    
    res.json({mensaje:true, datos: Object.values(resultadoFinal)});
    
})
export default crearClave;
//# sourceMappingURL=crearClaveCaja.js.map