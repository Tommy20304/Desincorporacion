import express from 'express';
import pool from "../database/conexionDatabase.js"; //se importa la conexion a la base de datos
import verificarToken from '../token/comprobarToken.js'; //se importa la funcion para verificar el token
import { CrearObjetos} from './logicaRouter/ingresarDatos/ingresarEnExcelNuevo.js';

const eliminar = express.Router();
eliminar.post("/eliminar-datos", verificarToken, async (req, res) => {
    try {
        const datosAcomodados = req.body.datos;
        
        //se saca solo los ids
        const ids = datosAcomodados.reduce((acc, row) => {
            acc.push(String(row.id_equipo));
            return acc;
        }, []);

        //se elimina los datos
        for (let id of ids) {
            await pool.query(`DELETE FROM equipos WHERE id_equipo = ${id}`);
        }
        res.json({ mensaje: 'se elimino los datos' });
    }
    catch (e) {
        console.log(e);
        res.json({ mensaje: false });
    }
});

eliminar.get("/obtener-ubicaciones", verificarToken, async (req, res) => {
    try {
        const ubicaciones = await pool.query("SELECT id_ubicacion, ubicacion_actual FROM ubicaciones");
        res.json({mensaje: true, ubicaciones: ubicaciones.rows});
    }catch (e) {
        res.json({ mensaje: false });
    }

});

eliminar.post("/desincorporar-datos", verificarToken, async (req, res) => {
    try{
        class Deshabilitar{
            columnasDisponibles:any
            columnasConId:any
            nombreColumnas:any
            objetoId:any
            datosAcomodados:any
            quitarDesincorporacion:any
            constructor(objetoId:any, datosAcomodados:any, quitarDesincorporacion:any){
                this.datosAcomodados = datosAcomodados;
                this.quitarDesincorporacion = quitarDesincorporacion //determina si se quita datos de la desincorporacion o no

                //un objeto para sacar el id de las columnas que necesitan id
                this.objetoId = objetoId; 

                //*--  Columnas Fundamentales  --*//

                //las columnas que se van a ingresar en la tabla de equipos deshabilitados
                this.columnasDisponibles = ['nombre_categoria', 'nombre_marca', 'nombre_modelo', 'serial', 'etiqueta', 'mac_addre', 'ubicacion_actual', 'nombre_usuario', 'clave_masiva', 'notas', 'fecha_registro'];
               
                //un objeto con las columnas que necesitan id
                this.columnasConId = {'nombre_categoria': 'categoria', 'nombre_marca': 'marca', 'nombre_modelo': 'modelo', 'ubicacion_actual': 'ubicaciones'};
                
                //un objeto con el nombre de las columnas de la tabla de equipos deshabilitados y su respectivo nombre en la tabla de equipos
                this.nombreColumnas = {'nombre_categoria': 'id_categoria', 'nombre_marca': 'id_marca', 'nombre_modelo': 'id_modelo', 'serial': 'serial',
                    'etiqueta': 'etiqueta', 'mac_addre': 'mac_addre', 'ubicacion_actual': 'id_ubicacion', 'nombre_usuario': 'id_usuario', 'clave_masiva': 'clave_masiva', 'notas': 'notas', 'fecha_registro': 'fecha_registro'};
            }

            //se retorna la consulta de ingresar los datos
            retornarConsulta(columnas:any, valores:any){
                /**
                 * columnas: un array con el nombre de las columnas a ingresar, por ejemplo: ['id_categoria', 'id_marca', 'serial']
                 * valores: un array con los valores a ingresar, por ejemplo: [1, 2, '12345']
                 */

                let tabla = (this.quitarDesincorporacion) ? "equipos" : 'equipos_desincorporados';
                return `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${valores.map((_:any, index:any) => `$${index + 1}`).join(', ')})`;
            }

            //retorna la fecha de desincorporacion, es decir, la fecha actual
            retornarFechaDesincorporacion(){
                return new Date().toLocaleDateString()+" "+new Date().toLocaleTimeString().substring(0,8);
            }

            //function que extrae el id de los equipos buscados
            extraerIdEquipos(){
                let ids = [];
                for (let filas of this.datosAcomodados) {
                    ids.push(filas.id_equipo);
                }
                return ids;
            }
            
            //funcion para extraer id de la columnas usuarios
            async extraerIdUsuarios(valor:any){
                const usuario = await pool.query(`SELECT cedula FROM usuarios WHERE nombre_usuario = '${valor}'`);
                return usuario.rows[0] ? usuario.rows[0].cedula : null;
            }

            //funcion que eliminar los equipos deshabilitados
            async eliminarEquiposDeshabilitados(){
                const ids = this.extraerIdEquipos();
                for(let id of ids){
                    //se elimina los datos
                    let tabla = (this.quitarDesincorporacion) ? "equipos_desincorporados" : 'equipos';
                    await pool.query(`DELETE FROM ${tabla} WHERE id_equipo = ${id}`);
                }
            }

            //funcion que ingresar los datos eliminados a la tabla de equipos deshabilitados
            async ingresarDatosDeshabilitados(){
                for(let filas of this.datosAcomodados){
                    let arrayValores = [];
                    let columnas = [];
                    for(let [clave, valor] of Object.entries(filas)){
                        let valor_:any = String(valor).trim();
                     
                        if(!this.columnasDisponibles.includes(clave)) continue; //si la clave no esta en las columnas disponibles, se omite
                
                        //si el valor incluye S/ y la clave no es notas ni ubicacion_actual, se omite, ya que el valor es nulo
                        if(valor_.includes("S/") && clave != 'notas' && clave != 'ubicacion_actual') continue;

                        //se coloca la ubicacion_actual, como la escogida
                        if(clave == 'ubicacion_actual') valor_ = req.body.ubicacion;

                        //se saca el id de las columnas correspondientes
                        if(Object.keys(this.columnasConId).includes(clave)){
                            valor_ = this.objetoId[this.columnasConId[clave]].items[valor_.toUpperCase()] ? this.objetoId[this.columnasConId[clave]].items[valor_.toUpperCase()] : null; //se asigna el id a la variable valor_
                        }

                        //se busca la id de la tabla usuarios
                        if(clave === 'nombre_usuario'){
                            valor_ = await this.extraerIdUsuarios(valor_);
                        }

                        columnas.push(this.nombreColumnas[clave]);
                        arrayValores.push(valor_);
                    }

                    if (!this.quitarDesincorporacion){
                        //se añade la fecha de desincorporacion
                        columnas.push('fecha_desincorporacion');
                        arrayValores.push(this.retornarFechaDesincorporacion());
                    }

                    //se ingresa los datos a la tabla de equipos deshabilitados
                    await pool.query(this.retornarConsulta(columnas, arrayValores), arrayValores);
                }
            }
    }
        //se determina si los datos son un array o no para acomodarlos de manera correcta
        const datos = Array.isArray(req.body.datos) ? req.body.datos : [req.body.datos];

        //se crea el objeto para sacar los id de las columnas que necesitan id
        let crear = new CrearObjetos();
        await crear.inicializar();

        const deshabilitar = new Deshabilitar(crear.objetos, datos, req.body.quitar);

        await deshabilitar.ingresarDatosDeshabilitados();
        await deshabilitar.eliminarEquiposDeshabilitados();
        
        res.json({ mensaje: true });
    }catch(e){
        console.log(e);
        res.json({ mensaje: false });
    }
});

eliminar.post("/verificar-datos", verificarToken, async (req, res) => {
    /*determina que los datos unicos (serial, etiqueta o mac_addre) de los registros que se vayan a pasar de una tabla a otra 
    (para desincorporar o quitar desincoporacion) ya existan en la tabla la cual se vayan a mandar*/
    try{
        //se comprueba si es un array
        const datos = Array.isArray(req.body.datos) ? req.body.datos : [req.body.datos];

        //se declaran los campos unicos
        const camposUnicos = ['serial', 'etiqueta', 'mac_addre'];

        //se define en cual tabla se va a buscar, si en la de desincorporacion o en la normal
        const tabla = (req.body.desincorporacion) ? 'equipos_desincorporados' : 'equipos';

        //busca si los campos unicos ya existen en la tabla
        for(let row of datos){
            for(let campo of camposUnicos){
                let result = await pool.query(`SELECT * FROM ${tabla} WHERE ${campo} = '${row[campo]}'`);
                if(result.rowCount > 0){
                    res.json({mensaje: 'datos existentes'});
                    return;
                }
            }
        }

        res.json({mensaje: 'ok'});
    }catch(e){
        console.log(e);
        res.json({mensaje: false});
    }
    
})
 
export default eliminar;
//# sourceMappingURL=eliminar.js.map