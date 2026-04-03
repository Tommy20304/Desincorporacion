import pool from "../../../database/conexionDatabase.js";
class AgregarClave {
    datos;
    clave;
    constructor(datos, clave) {
        this.datos = datos;
        this.clave = clave;
    }

    //determina que todos los registros tengan la misma ubicacion
    static determinarErrorUbicacion(datos) {
        /**
         * datos: un array de objetos que representan las filas de datos a verificar
         */

        //si el dato no tiene nada, se detiene
        if (datos.length == 0)
            return false;

        //recolecta todas las ubicaciones para determinar si hay alguna ubicacion
        let ubicaciones = []; 
        for (let filas of datos) {

            //se determina que hay una ubicacion diferente
            if (!ubicaciones.includes(filas.ubicacion_actual) && ubicaciones.length != 0) {
                return true;
            }
            ubicaciones.push(filas.ubicacion_actual);
        }
        return false;
    }

    //se determina que los registros no tengan una clave_caja ya existente
    static determinarClaveExistente(datos) {
        /**
         * datos: un array de objetos que representan las filas de datos a verificar
         */

        let filasClavesExistentes = [];
        for (let filas of datos) {
            let numFila = datos.indexOf(filas) + 2; //para saber el numero de fila en excel
            
            //se agrega la fila
            if (filas.clave_caja != 'S/C') {
                filasClavesExistentes.push(numFila); 
            }
        }
        return filasClavesExistentes;
    }

    //se determina que la clave ingresada existe o no existe
    static async determinarClave(clave){
        /**
         * clave: la clave a verificar
         */
        
        let result = await pool.query("SELECT clave_caja FROM equipos");

        //se determina que la clave exista
        const claveExistente = result.rows.find(row => row.clave_caja === clave);
        if(claveExistente)
            return true
        
        return false;
    }
    
    //se agrega la clave
    async agregarClave() {
        for (let filas of this.datos) {
            let identificador = filas.indicador;
            let consulta = `UPDATE equipos SET clave_caja = '${this.clave}' WHERE ${identificador} = '${filas[identificador]}'`;
            await pool.query(consulta);
        }
    }
}
export { AgregarClave };
//# sourceMappingURL=agregarClave.js.map