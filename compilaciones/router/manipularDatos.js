import express from 'express';
import pool from "../database/conexionDatabase.js"; //se importa la conexion a la base de datos
import verificarToken from '../token/comprobarToken.js'; //se importa la funcion para verificar el token
const manipular = express.Router();
manipular.get("/retornar-datos", verificarToken, async (req, res) => {
    let tablas = ["categoria", "marca", "modelo", "ubicaciones"];
    //se recopila la informacion de las consultas
    let datos = {};
    for (let column of tablas) {
        let result = await pool.query("SELECT * FROM " + column);
        datos[column] = result.rows;
    }
    res.json({ datos: datos });
});
manipular.post("/guardar-datos", verificarToken, async (req, res) => {
    //se guarda los datos a las tablas correspondientes
    try {
        const campos = {
            categoria: 'nombre_categoria',
            marca: 'nombre_marca',
            modelo: 'nombre_modelo',
            ubicaciones: 'ubicacion_actual'
        };
        const consulta = `INSERT INTO ${req.body.clave} (${campos[req.body.clave]}) VALUES ($1)`;
        await pool.query(consulta, [req.body.dato.trim()]);
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
manipular.post("/eliminar-datos", verificarToken, async (req, res) => {
    //se elimina los datos de las tablas correspondientes
    try {
        const campos = {
            categoria: 'id_categoria',
            marca: 'id_marca',
            modelo: 'id_modelo',
            ubicaciones: 'id_ubicacion'
        };
        await pool.query(`DELETE FROM ${req.body.clave} WHERE ${campos[req.body.clave]} = ${req.body.dato}`);
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
manipular.post("/actualizar-datos", verificarToken, async (req, res) => {
    //se actualiza los datos de las tablas correspondientes
    try {
        const camposId = {
            categoria: 'id_categoria',
            marca: 'id_marca',
            modelo: 'id_modelo',
            ubicaciones: 'id_ubicacion'
        };
        const camposNombres = {
            categoria: 'nombre_categoria',
            marca: 'nombre_marca',
            modelo: 'nombre_modelo',
            ubicaciones: 'nombre_ubicacion'
        };
        const consulta = `UPDATE ${req.body.clave} SET ${camposNombres[req.body.clave]} = '${req.body.reemplazo.trim()}'
        WHERE ${camposId[req.body.clave]} = ${req.body.dato}`;
        await pool.query(consulta);
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
manipular.post("/actualizar-varios", verificarToken, async (req, res) => {
    try {
        class ActualizarVarios {
            columnaId;
            columnaNombre;
            ids;
            reemplazo;
            clave;
            constructor(ids, reemplazo, clave) {
                this.columnaId = {
                    categoria: 'id_categoria',
                    marca: 'id_marca',
                    modelo: 'id_modelo',
                    ubicaciones: 'id_ubicacion'
                }[clave];
                this.columnaNombre = {
                    categoria: 'nombre_categoria',
                    marca: 'nombre_marca',
                    modelo: 'nombre_modelo',
                    ubicaciones: 'nombre_ubicacion'
                }[clave];
                this.ids = ids;
                this.reemplazo = reemplazo.toUpperCase();
                this.clave = clave;
            }
            async insertarReemplazo() {
                const consulta = `INSERT INTO ${this.clave} (${this.columnaNombre}) VALUES ($1)`;
                await pool.query(consulta, [this.reemplazo + '_']);
            }
            //se busca el id del dato ingresado
            async buscarId() {
                const result = await pool.query(`SELECT ${this.columnaId} FROM ${this.clave} WHERE ${this.columnaNombre} = '${this.reemplazo + '_'}'`);
                const idNueva = result.rows[0][this.columnaId];
                return idNueva;
            }
            //buscar los equipos con los datos que se van a actualizar
            async buscarEquipos() {
                let idsEquipo = [];
                for (let id of ids) {
                    const consulta = `SELECT id_equipo FROM equipos WHERE ${this.columnaId} = ${id}`;
                    const result = await pool.query(consulta);
                    result.rows.forEach(row => {
                        idsEquipo.push(row.id_equipo);
                    });
                }
                //los ids de los activos desincorporados
                let idsDesincorporacion = [];
                for (let id of ids) {
                    const consulta = `SELECT id_equipo FROM equipos_desincorporados WHERE ${this.columnaId} = ${id}`;
                    const result = await pool.query(consulta);
                    result.rows.forEach(row => {
                        idsDesincorporacion.push(row.id_equipo);
                    });
                }
                return { idsEquipo, idsDesincorporacion };
            }
            //se actualizan los equipos que tenian los modelos a actualizar con el modelo nuevo
            async actualizarEquipos() {
                //se busca la id del nuevo dato ingresado
                const idNueva = await this.buscarId();
                const { idsEquipo, idsDesincorporacion } = await this.buscarEquipos();
                //se actualizan los equipos
                for (let id of idsEquipo) {
                    await pool.query(`UPDATE equipos SET ${this.columnaId} = ${idNueva} WHERE id_equipo = ${id}`);
                }
                for (let id of idsDesincorporacion) {
                    await pool.query(`UPDATE equipos_desincorporados SET ${this.columnaId} = ${idNueva} id_equipo = ${id}`);
                }
            }
            //se eliminan los datos seleccionados de su tabla
            async eliminar() {
                for (let id of this.ids) {
                    await pool.query(`DELETE FROM ${this.clave} WHERE ${this.columnaId} = ${id}`);
                }
            }
            //se cambia el nombre del dato ingresado
            async cambiarNombre() {
                const idNueva = await this.buscarId();
                await pool.query(`UPDATE ${this.clave} SET ${this.columnaNombre} = '${this.reemplazo}' WHERE ${this.columnaId} = ${idNueva}`);
            }
        }
        const { ids, reemplazo, clave } = req.body;
        const actualizar = new ActualizarVarios(ids, reemplazo.trim(), clave);
        await actualizar.insertarReemplazo();
        await actualizar.actualizarEquipos();
        await actualizar.eliminar();
        await actualizar.cambiarNombre();
        res.json({ mensaje: true });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
manipular.post("/verificar-uso", verificarToken, async (req, res) => {
    //se verifica si el dato ya se esta usando y no se puede eliminar
    try {
        let datoUsado = false;
        const campos = {
            categoria: ['id_categoria', 'nombre_categoria'],
            marca: ['id_marca', 'nombre_marca'],
            modelo: ['id_modelo', 'nombre_modelo'],
            ubicaciones: ['id_ubicacion', 'ubicacion_actual']
        };
        //se comprueba que el dato se este utilizando
        let resultPorDesincorporar = await pool.query(`SELECT ${campos[req.body.clave][0]} FROM equipos WHERE ${campos[req.body.clave][0]} = ${req.body.dato}`);
        let resultDesincorporar = await pool.query(`SELECT ${campos[req.body.clave][0]} FROM equipos_desincorporados WHERE ${campos[req.body.clave][0]} = ${req.body.dato}`);
        //si alguna de estas pasa, se pone como que el dato se esta usando
        if (resultPorDesincorporar.rowCount || resultDesincorporar.rowCount)
            datoUsado = true;
        res.json({ mensaje: true, datoUsado: datoUsado });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});
export default manipular;
//# sourceMappingURL=manipularDatos.js.map
//# sourceMappingURL=manipularDatos.js.map