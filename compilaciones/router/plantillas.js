import express from 'express';
import multer from "multer";
import xlsx from "xlsx";
import exceljs from "exceljs";
import fs from "fs"; //sirve para elminar archivos
import path from "path";
import verificarToken from '../token/comprobarToken.js';
import { CrearPlantilla, FormarInfoPlanillas } from './logicaRouter/plantillas/crearPlantillas.js';
import pool from "../database/conexionDatabase.js";
// Configuración de almacenamiento de Multer
const storage = multer.memoryStorage();
const cargar = multer({ storage: storage });
//configuracion para guardar imagenes
let mul = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/imagenes plantillas/');
    },
    filename: function (req, file, cb) {
        //se cambia el nombre del archivo a un formato UTF-8
        const nombreCorregido = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const ext = path.extname(nombreCorregido);
        const name = path.basename(nombreCorregido, ext);
        cb(null, `${name}${ext}`);
    }
});
const upload = multer({ storage: mul });
const plantilla = express.Router();
plantilla.get("/info", verificarToken, async (req, res) => {
    //retorna la informacion de las planillas
    let resultado = await pool.query("SELECT * FROM plantilla");
    const formado = new FormarInfoPlanillas(resultado.rows);
    let informacion = formado.formarInfoPlantilla();
    return res.json({ datos: informacion });
});
plantilla.get("/info-eliminar", verificarToken, async (req, res) => {
    //devuelve una info especifico para la pagina para eliminar plantillas
    //para retornar la ruta de la imagen
    const formado = new FormarInfoPlanillas(null);
    const result = await pool.query("SELECT * FROM plantilla");
    //se cambian los nombres de las columnas
    let datos = result.rows.map((element) => {
        let nuevoFila = {};
        nuevoFila['id'] = element.id_plantilla;
        nuevoFila['nombre'] = element.nombre.replace('.xlsx', '');
        nuevoFila['imagen'] = element.nombre_imagen ;
        return nuevoFila;
    });
    return res.json({ datos: datos });
});
plantilla.post("/crear", verificarToken, async (req, res) => {
    try {
        //se forman las plantillas 
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_generado.xlsx');
        let libro;
        let datos = req.body.datos;
        //se hace la consulta para acceder a los datos de las plantillas
        let resultado = await pool.query("SELECT * FROM plantilla");
        //se recopila los datos de la plantilla
        const formado = new FormarInfoPlanillas(resultado.rows);
        const info = formado.formarInfoPlantilla()[req.body.clave];
        const rutas = formado.retornarRutasExcel()[req.body.clave];
        //se inicializa el objeto
        let crear = new CrearPlantilla(req.body.clave, datos, req.body.columnasPedidas, info, rutas);
        if (crear.clavePlantilla != 'simple') {
            if (req.body.otraHoja)
                libro = (req.body.otraHoja == 'unica') ? await crear.agregarRegistrosFaltantes() : await crear.agregarRegistrosPlantilla();
            else
                libro = await crear.crearPlantilla();
        }
        else
            libro = await crear.crearPlantillaSimple();
        await libro.xlsx.write(res); //se manda el archivo
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: 'error' });
    }
});
plantilla.post("/retornar-columnas", verificarToken, cargar.single("fileExcel"), async (req, res) => {
    //retorna las columnas del archivo excel
    try {
        //se instacia la clase
        let libro = new exceljs.Workbook();
        //esperamos a que se lea el archivo en formato buffer
        await libro.xlsx.load(req.file.buffer);
        let hoja = libro.getWorksheet(1);
        //para columnas del excel
        let letras = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S",
            "T", "U", "V", "W", "X", "Y", "Z"
        ];
        let columnas = [];
        //se define la fila inicial, si no se define, se pone como 1
        let Filainicio = (req.body.inicio != "null") ? (Number(req.body.inicio) - 1) : 1;
        //itera sobre la fila
        for (let index in letras) {
            let celda = hoja.getCell(`${letras[index]}${Filainicio}`);
            if (!celda.value) {
                break;
            }
            columnas.push(celda.value);
        }
        let celda = hoja.getCell(`A1`);
        //si no se consiguio ninguna columna, se pone un error
        if (!columnas.length) {
            return res.json({ mensaje: false });
        }
        res.json({ mensaje: true, columnas: columnas });
    }
    catch (e) {
        console.log(e);
        return res.json({ mensaje: false });
    }
});
plantilla.post("/guardar-plantilla", verificarToken, async (req, res) => {
    //se guarda los datos de la planilla en la base de datos
    class ArreglarDatos {
        datos;
        nombresColumnas;
        columnasPlanillas;
        constructor(datos) {
            this.datos = datos;
            //columnas de la base de datos de plantillas
            this.columnasPlanillas = {
                itemMaximo: "item_maximo", limiteInicio: "limite_inicial", columnasDisponibles: "columnas_disponibles",
                limiteFinal: "limite_final", columnasOriginales: "columnas_originales", nombreExcel: 'nombre', nombreImagen: 'nombre_imagen',
                descripcion: "descripcion"
            };
            //las columnas del archivo
            this.nombresColumnas = {
                'categoria': "nombre_categoria", marca: "nombre_marca", modelo: "nombre_modelo", serial: "serial", etiqueta: "etiqueta",
                mac_addre: "mac_addre", usuario: 'nombre_usuario', condicion: 'nombre_condicion', ubicacion_actual: 'ubicacion_actual', notas: 'notas', fecha_registro: 'fecha_registro',
                componentes_buenos: "bueno", componentes_malos: "malo"
            };
        }
        //se arregla las columnas disponibles
        crearColumnasDisponibles() {
            let columnas = [];
            for (let [clave, valor] of Object.entries(this.datos.columnasDisponibles)) {
                let valor_ = valor;
                if (!valor_)
                    continue;
                //arreglo los objetos para que sean: nombre_categoria: columna
                valor_ = valor_.replace(" ", "_");
                let nuevoObjeto = {};
                nuevoObjeto[this.nombresColumnas[valor_]] = clave;
                //se parsea para que sea un string
                columnas.push(JSON.stringify(nuevoObjeto));
            }
            return columnas;
        }
        //se forma el objeto
        formarObjeto() {
            let nuevoObjeto = {};
            for (let [clave, valor] of Object.entries(this.datos)) {
                if (!valor)
                    continue;
                if (clave == "columnasDisponibles") {
                    nuevoObjeto[this.columnasPlanillas[clave]] = this.crearColumnasDisponibles();
                    continue;
                }
                nuevoObjeto[this.columnasPlanillas[clave]] = valor;
            }
            return nuevoObjeto;
        }
    }
    try {
        //se elimina los campos de archivos
        delete req.body.planilla.archivoExcel;
        delete req.body.planilla.archivoImagen;
        //se forma el objeto definitivo
        const arreglar = new ArreglarDatos(req.body.planilla);
        const objetoDefinitivo = arreglar.formarObjeto();
        //se realizar la insertacion
        const columnas = Object.keys(objetoDefinitivo);
        const valores = Object.values(objetoDefinitivo);
        // Generamos los placeholders ($1, $2, etc.)
        const placeholders = columnas.map((_, i) => `$${i + 1}`).join(", ");
        const query = `INSERT INTO plantilla (${columnas.join(", ")}) VALUES (${placeholders})`;
        await pool.query(query, valores);
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
plantilla.post("/guardar-archivo", verificarToken, cargar.single("fileExcel"), async (req, res) => {
    //se guarda el archivo excel
    try {
        //se instacia la clase
        let libro = new exceljs.Workbook();
        await libro.xlsx.load(req.file.buffer);
        let ruta = "src/plantillas excel/";
        //se cambia el nombre del archivo a un formato UTF-8
        const nombreCorregido = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        //se guarda el archivo
        await libro.xlsx.writeFile(ruta + nombreCorregido);
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        //si ocurre algun error se elimina los datos que se ingresaron
        let result = await pool.query("SELECT * FROM plantilla");
        let ultimoResult = result.rows[(result.rows.length - 1)];
        await pool.query("DELETE FROM plantilla WHERE id_plantilla = " + ultimoResult.id_plantilla);
        res.json({ mensaje: false });
    }
});
plantilla.post("/guardar-imagen", verificarToken, upload.single('imagen'), async (req, res) => {
    //se guarda el archivo de imagen
    try {
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        //si ocurre algun error se elimina los datos que se ingresaron
        let result = await pool.query("SELECT * FROM plantilla");
        let ultimoResult = result.rows[(result.rows.length - 1)];
        await pool.query("DELETE FROM plantilla WHERE id_plantilla = " + ultimoResult.id_plantilla);
        res.json({ mensaje: false });
    }
});
plantilla.post("/verificar-archivo", verificarToken, async (req, res) => {
    //se verifica si ya existen los archivos
    try {
        let resultado = await pool.query("SELECT * FROM plantilla");
        //se verifica cual archivo ya existe
        for (let filas of resultado.rows) {
            if (filas.nombre == req.body.nombreExcel)
                return res.json({ mensaje: true, repetido: 'excel' });
            if (filas.nombre_imagen == req.body.nombreImagen)
                return res.json({ mensaje: true, repetido: 'imagen' });
        }
        res.json({ mensaje: true, repetido: null });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false, repetido: null });
    }
});
plantilla.post("/eliminar-plantilla", verificarToken, async (req, res) => {
    try {
        const formado = new FormarInfoPlanillas(null);
        //se busca los nombres de los archivos
        let result = await pool.query("SELECT nombre_imagen, nombre FROM plantilla WHERE id_plantilla = " + req.body.id);
        const nombreImagen = result.rows[0].nombre_imagen;
        const nombreExcel = result.rows[0].nombre;
        //se elimina los datos de la base de datos
        await pool.query("DELETE FROM plantilla WHERE id_plantilla = " + req.body.id);
        //se eliminan los archivos
        fs.unlinkSync('src/imagenes plantillas/' + nombreImagen);
        fs.unlinkSync(formado.retornarRuta('excel', nombreExcel));
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
export default plantilla;
//# sourceMappingURL=plantillas.js.map
//# sourceMappingURL=plantillas.js.map
