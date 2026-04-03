import express from 'express';
import multer from "multer";
import xlsx from "xlsx";
import pool from "../database/conexionDatabase.js";
import sinonimos from './logicaRouter/ingresarDatos/sinonimos.js';
import verificarToken from '../token/comprobarToken.js';
import { VerificarDatos, CrearObjetos, ingresarDatos } from './logicaRouter/ingresarDatos/ingresarEnExcelNuevo.js';

const router = express.Router(); //la instancia de router

// Configuración de almacenamiento de Multer
const storage = multer.memoryStorage();
const cargar = multer({ storage: storage });

router.post("/determinar-error", verificarToken, cargar.single("fileExcel"), async (req:any, res) => {
    try {
        //si no hay ningun archivo
        if (!req.file) {
            return res.json({ mensaje: false });
        }
        //leer el archivo desde la ruta en la que se guardo
        const libro = xlsx.read(req.file.buffer, { type: 'buffer' }); 

        //se obtiene el nombre de la primera hoja
        const nombreHoja = libro.SheetNames[0];
        
        //se accede a la hoja
        const hoja = libro.Sheets[nombreHoja]; 

        // convierte el contenido de la hoja en formato json
        const datos = xlsx.utils.sheet_to_json(hoja); 
       
        //creamos los objetos que contienen informacion de las tablas de diccionarios de la BD
        let crear = new CrearObjetos();
        await crear.inicializar(); 

        //verificamos los datos
        let verificar = new VerificarDatos(datos, crear.objetos);
        verificar.DeterminarDatos();
        verificar.determinarComponentes();
        await verificar.DeterminarPresencia();

        //se corre funciones, para verificar errores adicionales en el frond-end
        const columnasNoContadas = verificar.comprobarEncabezados();
        const columnaNoPresente = verificar.columnaNoPresente();
        const posibleIngreso = verificar.posibleIngreso;
    
        if (Object.keys(verificar.listaErrores).length > 0) {
            res.json({ mensaje: "error", listaErrores: verificar.listaErrores, columnasNocontadas: columnasNoContadas,
                columnaNoPresente: columnaNoPresente, categoriaNula: verificar.ComprobarColumnaNula("categoria"), condicionNula: verificar.ComprobarColumnaNula("condicion"),
                posibleIngreso: posibleIngreso });
            return;
        }

        if (Object.keys(verificar.columnasEncontradas).length == 0) {
            res.json({ mensaje: "ningun dato se puede mandar", posibleIngreso: posibleIngreso });
            return;
        }

        if (columnasNoContadas) {
            res.json({ mensaje: "columnas innecesarias", columnas: columnasNoContadas, columnaNoPresente: columnaNoPresente, posibleIngreso: posibleIngreso });
            return;
        }

        //si manda esto si no hay ningun error
        res.json({ mensaje: "ningun error", columnaNoPresente: columnaNoPresente, posibleIngreso: posibleIngreso });
    }
    catch (error) {
        console.log(error);
        res.json({ mensaje: false, error: "error-servidor" });
    }
});
router.post("/mandar-excel", verificarToken, cargar.single("fileExcel"), async (req:any, res) => {
    try {
        //si no hay ningun archivo
        if (!req.file) { 
            return res.json({ mensaje: false });
        }

        //se recopila los datos del excel
        const libro = xlsx.read(req.file.buffer, { type: 'buffer' });
        const nombreHoja = libro.SheetNames[0];
        const hoja = libro.Sheets[nombreHoja];
        const datos = xlsx.utils.sheet_to_json(hoja);

        //se crea los objetos
        let crear = new CrearObjetos();
        await crear.inicializar();

        //se verifica los datos
        let verificar = new VerificarDatos(datos, crear.objetos);
        verificar.DeterminarDatos();
        verificar.determinarComponentes();
        await verificar.DeterminarPresencia();
        let ingresar = new ingresarDatos(datos, crear.objetos, verificar, req.body.clave, req.body.id_usuario);
       
        //si ocurre un error en el ingreso de los datos, se elimina los datos que se habian mandado
        try {
            await ingresar.recorrerDatos();
            res.json({ mensaje: "el archivo se mando correctamente" });
        }
        catch (e) {
            console.log(e);
            await ingresar.eliminarDatos();
            res.json({ mensaje: false });
        }
    }
    catch (e) {
        res.json({ mensaje: false });
        console.log(e);
    }
});

router.post("/determinar-clave-masiva", verificarToken, async (req, res) => {
    //se determina si ya existe al clave maxiva
    let resultado = await pool.query(`SELECT * FROM equipos WHERE clave_masiva = '${req.body.clave}'`);
    
    if (resultado.rowCount) 
        return res.json({ mensaje: true });
    
    res.json({ mensaje: false });
});

router.post("/verificar-campos", verificarToken, async (req, res) => {
    //se verifica si los datos de etiqueta y serial ya existen, en el ingresar-manual
    try {
        let camposExistentes = [];

        for (let campo of ['serial', 'etiqueta', 'mac_addre']) {

            if (!req.body.datosIngresados[campo])
                continue;
            
            let result = await pool.query(`SELECT * FROM equipos WHERE ${campo} = '${req.body.datosIngresados[campo]}'`);
            if (result.rowCount) {
                camposExistentes.push(campo);
            }
        }

        if (camposExistentes.length > 0) 
            return res.json({ mensaje: true, campos: camposExistentes });
        
        return res.json({ mensaje: false });
    }
    catch (e) {
        console.log(e);
        return res.json({ mensaje: false });
    }
});

router.post("/ingresar-manual", verificarToken, async (req, res) => {
    //se ingresan datos manualmente
    try {
        const { datosIngresados } = req.body;
    
    // se determina la fecha
    const fechaRegistro = new Date().toLocaleDateString()+" "+new Date().toLocaleTimeString().substring(0,8);

    const mapaColumnas: Record<string, string> = {
        categoria: 'id_categoria', marca: 'id_marca', modelo: 'id_modelo',
        etiqueta: 'etiqueta', mac_addre: 'mac_addre', serial: 'serial',
        ubicacion: 'id_ubicacion', notas: 'notas', usuario: 'id_usuario'
    };

    // Iniciamos con la fecha por defecto
    const columnas = ['fecha_registro'];
    const valoresInyectables = [fechaRegistro];

    for (let [clave, valor] of Object.entries(datosIngresados)) {

        // Validar que el valor no esté vacío (0, null, undefined, "")
        if (valor === undefined || valor === null || String(valor).trim() === "") continue;

        // Caso A: Componentes especiales ('bueno', 'malo')
        if (['bueno', 'malo'].includes(clave) && Array.isArray(valor)) {
            for (let item of valor) {
                const nombreColumna = String(item) == "fuente de poder" ? String(item).replace(" de ", "_") : String(item).replace(/\s+/g, '_');
                columnas.push(nombreColumna);
                valoresInyectables.push(clave); // 'bueno' o 'malo'
            }
            continue;
        }

        // Caso B: Columnas mapeadas normales
        const nombreColumna = mapaColumnas[clave];
        if (nombreColumna) {
            columnas.push(nombreColumna);

            // Transformación especial para serial
            const valorFinal:any = (clave === 'serial') ? String(valor).toUpperCase() : valor;
            valoresInyectables.push(valorFinal);
        }
    }

    //Construcción segura del Query con placeholders ($1, $2, etc.)
    const placeholders = valoresInyectables.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO equipos (${columnas.join(", ")}) VALUES (${placeholders})`;

    await pool.query(sql, valoresInyectables);

    res.json({ mensaje: true })
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
router.post("/guardar-datos", verificarToken, async (req, res) => {
    //se guarda los datos que no estan registrados
    try {
        const nombreCampos = { categoria: "nombre_categoria", marca: "nombre_marca", modelo: "nombre_modelo", ubicaciones: "ubicacion_actual" };
        for (let [clave, valor] of Object.entries(req.body.datos)) {
        
            if (Array.isArray(valor)) {
                for (let item of valor) {
                    let consulta = `INSERT INTO ${clave} (${nombreCampos[clave]}) VALUES ($1)`;
                    await pool.query(consulta, [item]); //se ingresan los datos;
                }
            }
            else {
                //si es solo un string, se manda asi
                let consulta = `INSERT INTO ${clave} (${nombreCampos[clave]}) VALUES ($1)`;
                await pool.query(consulta, [valor]); //se ingresan los datos;
            }
        }
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        return res.json({ mensaje: false });
    }
});
router.get("/leer-sinonimos", verificarToken, async (req, res) => {
    //se leen los sinonimos de las columnas
    try {
        //const verificar = new VerificarDatos(null, null);
        const sinonimosColumnas = sinonimos.sinonimosColumnas();
        res.json({ mensaje: true, sinonimos: sinonimosColumnas });
    }
    catch (e) {
        res.json({ mensaje: false });
        console.log(e);
    }
});
export default router;
//# sourceMappingURL=ingresarDatos.js.map