import express from 'express';
import pool from "../database/conexionDatabase.js"; //se importa la conexion a la base de datos
import multer from "multer";
import xlsx from "xlsx";
import verificarToken from '../token/comprobarToken.js';
import { VerificarDatos, CrearObjetos, ingresarDatos } from './logicaRouter/ingresarDatos/ingresarEnExcelNuevo.js';
import { ManejarActualizacion } from './logicaRouter/actualizar/manejarActualizacion.js';
/*Errores con las expcesiones con posibles ingresos, errores con los datos que ya existen que estan presentes en el propio registro*/
const actualizar = express.Router();
// Configuración de almacenamiento de Multer
const storage = multer.memoryStorage();
const cargar = multer({ storage: storage });
actualizar.post("/leer-archivo", verificarToken, cargar.single("actualizar"), async (req, res) => {
    try {
        //si no hay ningun archivo
        if (!req.file)
            return res.json({ mensaje: false });
        //se acomodan los datos buscado
        const datosBuscados = JSON.parse(req.body.datosBuscados);
        //se saca el id de los equipos buscados, para comparalos con los del archivo y buscar excepciones
        const ids = datosBuscados.reduce((acc, row) => {
            acc.push(String(row.id_equipo));
            return acc;
        }, []);
        //se saca la informacion del archivo
        const libro = xlsx.read(req.file.buffer, { type: 'buffer' });
        const nombreHoja = libro.SheetNames[0];
        const hoja = libro.Sheets[nombreHoja];
        let datos = xlsx.utils.sheet_to_json(hoja);
        //creamos los objetos con los datos de las tablas diccionarios
        let crear = new CrearObjetos();
        await crear.inicializar();
        //verificamos los datos
        let verificar = new VerificarDatos(datos, crear.objetos);
        verificar.DeterminarDatos();
        verificar.determinarComponentes();
        await verificar.DeterminarPresencia();
        //se corre funciones, para verificar errores adicionales en el frond-end
        let columnasNoContadas = verificar.comprobarEncabezados();
        let columnaNoPresente = null;
        const posibleIngreso = verificar.posibleIngreso;
        //se inicializa el manejo de actualizacion
        const manejarActualizacion = new ManejarActualizacion(datos);
        let filasNoCompatibles = [];
        let ids_excel = [];
        //se determina si tiene el id
        let resultado = manejarActualizacion.determinarColumnaId(ids);
        //si lo tiene se hace esto
        if (resultado) {
            filasNoCompatibles = resultado.filasNoCompatibles; //las filas no compatibles, que no tienen el id
            ids_excel = resultado.ids_excel; //los ids identificados del archivo
            let indice = columnasNoContadas.indexOf(resultado.nombreColumnaID);
            //se elimina la columna del id en las columnas no contadas
            columnasNoContadas.splice(indice, 1);
            //si la columna no tiene elemento, se pone como false
            columnasNoContadas = (!columnasNoContadas.length) ? false : columnasNoContadas;
        }
        else {
            //si no lo tiene, se pone como columna no presente
            columnaNoPresente = "ID";
        }
        //se determina si hay un posible ingreso, para añadirlo a la lista de errores
        if (Object.keys(posibleIngreso).length) {
            const recorrerPosibleIngreso = Object.entries(posibleIngreso);
            recorrerPosibleIngreso.forEach(([clave, valor]) => {
                for (let item of valor) {
                    verificar.ingresarListaError("dato no valido para la columna " + clave, item, null);
                }
            });
        }
        //se determina si existen errores
        if (Object.keys(verificar.listaErrores).length > 0) {
            res.json({
                mensaje: "error",
                listaErrores: verificar.listaErrores,
                columnasNocontadas: columnasNoContadas,
                columnaNoPresente: columnaNoPresente,
                posibleIngreso: posibleIngreso,
                filasNoCompatibles: filasNoCompatibles,
                ids_excel: ids_excel
            });
            return;
        }
        //se determina si ningun dato se puede mandar
        if (Object.keys(verificar.columnasEncontradas).length == 0) {
            res.json({ mensaje: "ningun dato se puede mandar", posibleIngreso: posibleIngreso });
            return;
        }
        //se determina si existen columnas innecesarias
        if (columnasNoContadas) {
            res.json({
                mensaje: "columnas innecesarias",
                columnas: columnasNoContadas,
                columnaNoPresente: columnaNoPresente,
                posibleIngreso: posibleIngreso,
                filasNoCompatibles: filasNoCompatibles,
                ids_excel: ids_excel
            });
            return;
        }
        //acomodo las columnas para que sean acorde a la base de datos
        const Newdatos = manejarActualizacion.acomodarColumnas(verificar);
        //si manda esto si no hay ningun error
        res.json({
            mensaje: "ningun error",
            columnaNoPresente: columnaNoPresente,
            posibleIngreso: posibleIngreso,
            datos: Newdatos,
            filasNoCompatibles: filasNoCompatibles,
            ids_excel: ids_excel
        });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
actualizar.post("/actualizar-datos", verificarToken, async (req, res) => {
    try {
        //se define los ids del excel
        const ids = req.body.ids_excel;
        //se actualizan los datos
        for (let filas in req.body.datosReemplazar) {
            //si el index no esta ahi se pasa, ya que quiere decir que no tiene id
            if (!Object.keys(ids).includes(filas))
                continue;
            //se forman los cambios de la consulta, es decir, lo que va despues del set
            const cambios = Object.entries(req.body.datosReemplazar[filas]).map(([column, dato]) => `${column} = '${dato}'`);
            //se forma la consulta
            let consulta = `UPDATE equipos SET ${cambios.join(", ")} WHERE id_equipo = ${ids[filas]}`;
            await pool.query(consulta);
        }
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
actualizar.post("/leer-archivo-nuevo", verificarToken, cargar.single("actualizar"), async (req, res) => {
    //se encarga de quitar los errores del archivo original
    try {
        //si no hay ningun archivo
        if (!req.file)
            return res.json({ mensaje: false });
        //se saca la informacion del archivo
        const libro = xlsx.read(req.file.buffer, { type: 'buffer' });
        const nombreHoja = libro.SheetNames[0];
        const hoja = libro.Sheets[nombreHoja];
        const datos = xlsx.utils.sheet_to_json(hoja);
        //creamos los objetos con los datos de las tablas diccionarios
        let crear = new CrearObjetos();
        await crear.inicializar();
        //verificamos los datos
        let verificar = new VerificarDatos(datos, crear.objetos);
        verificar.DeterminarDatos();
        verificar.determinarComponentes();
        await verificar.DeterminarPresencia();
        //se instancia para poder usar la funcion de comprobar errores
        let ingresar = new ingresarDatos(datos, crear.objetos, verificar, null, null);
        //se crean los nuevos datos, quitando los errores
        let nuevosDatos = datos.map(row => {
            let newRow = {};
            for (let [clave, valor] of Object.entries(row)) {
                //IMPORTANTE:si exite un error, no se añade
                if (ingresar.comprobarErrores(String(valor).trim(), clave))
                    continue;
                /*si existe un componente repetido, el componente en cuestion, se colocara en los componentes malos, en la parte de acomodarDatos de manejarActualizacion */
                //si una de las columnas esta en las columnas definitivas
                if (Object.values(verificar.columnasEncontradas).includes(clave)) {
                    newRow[clave] = valor;
                }
            }
            return newRow;
        });
        //se inicializa la clase de manejar actualizaciones
        const manejarActualizacion = new ManejarActualizacion(nuevosDatos);
        nuevosDatos = manejarActualizacion.acomodarColumnas(verificar);
        res.json({ mensaje: "se leyo el archivo", datos: nuevosDatos });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
actualizar.post("/actualizar-manual", verificarToken, async (req, res) => {
    try {
        let nombreColumnas = {
            'categoria': 'id_categoria',
            'marca': 'id_marca',
            'modelo': 'id_modelo',
            'etiqueta': 'etiqueta',
            'serial': 'serial',
            'mac_addre': 'mac_addre',
            'ubicacion': 'id_ubicacion',
            'notas': 'notas'
        };
        let listaComponentes = ["cpu", "ram", "pantalla", "carcasa", "disco_duro", "tarjeta_madre", "fan_cooler", "fuente_poder"];
        //se forman los cambios de la consulta, es decir, lo que va despues del set
        const cambios = Object.entries(req.body.datosIngresados).flatMap(([column, dato]) => {
            //si son componentes, se ingresan de manera especial
            if (['bueno', 'malo'].includes(column)) {
                const datoValido = dato;
                return datoValido.map(element => {
                    const elementFormateado = String(element) == "fuente de poder" ? String(element).replace(" de ", "_") : String(element).replace(/\s+/g, '_');
                    ;
                    return `${elementFormateado} = '${column}'`;
                });
            }
            //se determina si los valores son nulos, si lo son, se ponen como nulos
            if (!dato) {
                return `${nombreColumnas[column]} = NULL`;
            }
            //se coloca normal
            dato = (column == 'serial') ? String(dato).toUpperCase() : dato;
            return `${nombreColumnas[column]} = '${dato}'`;
        });
        //se comprueba cuales componentes faltan, los faltantes, se colocan como nulos
        //se crea un array con solo los componentes de los datosIngresados
        const itemsComponentes = Object.values(req.body.datosIngresados).flatMap(item => {
            if (Array.isArray(item)) {
                return item.map(comp => {
                    comp = String(comp) == "fuente de poder" ? String(comp).replace(" de ", "_") : String(comp).replace(/\s+/g, '_');
                    return listaComponentes.includes(comp) ? comp : undefined;
                });
            }
        });
        //se busca los componentes que faltan y se pone como nulos
        for (let comp of listaComponentes) {
            if (!itemsComponentes.includes(comp)) {
                cambios.push(`${comp} = NULL`);
            }
        }
        //se forma la consulta
        const consulta = `UPDATE equipos SET ${cambios.join(", ")} WHERE id_equipo = ${req.body.id}`;
        await pool.query(consulta);
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
actualizar.post("/actualizar-conjunto", verificarToken, async (req, res) => {
    try {
        const nombreColumnas = {
            'categoria': 'id_categoria',
            'marca': 'id_marca',
            'modelo': 'id_modelo',
            'etiqueta': 'etiqueta',
            'serial': 'serial',
            'mac_addre': 'mac_addre',
            'ubicacion': 'id_ubicacion',
            'notas': 'notas'
        };
        //se forman los cambios de la consulta, es decir, lo que va despues del set
        const cambios = Object.entries(req.body.datosActualizar).flatMap(([column, dato]) => {
            //se determina si los valores son nulos
            if (!dato) {
                return null;
            }
            //si son componentes, se ingresan de manera especial
            if (['bueno', 'malo'].includes(column)) {
                const datoValido = dato;
                return datoValido.map(element => {
                    const elementFormateado = element.includes(" ") ? element.replace(" ", "_") : element.replace(" de ", "_");
                    return `${elementFormateado} = '${column}'`;
                });
            }
            //se coloca normal
            dato = (column == 'serial') ? String(dato).toUpperCase() : dato;
            return `${nombreColumnas[column]} = '${dato}'`;
        });
        //se filtran los valores nulos y arrays vacios
        const cambiosFiltrados = cambios.filter(item => typeof item == 'string');
        //se hacen las actualizaciones
        req.body.ids.forEach(async (id) => {
            const consulta = `UPDATE equipos SET ${cambiosFiltrados.join(", ")} WHERE id_equipo = ${id}`;
            await pool.query(consulta);
        });
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
export default actualizar;
//# sourceMappingURL=actualizar.js.map
//# sourceMappingURL=actualizar.js.map