import pool from "../../../database/conexionDatabase.js";
class BuscarIdentificadores {
    datos;
    datosObtenidos;
    identificadores;
    filasNoObtenidas;
    registrosRepetidos;
    camposDisponibles;
    constructor(datos, camposDisponibles) {
        this.datos = datos;
        //las columnas por las cuales se va a buscar
        this.identificadores = ['serial', 'etiqueta', 'mac_addre'];
        this.datosObtenidos = [];
        this.filasNoObtenidas = [];
        this.registrosRepetidos = [];
        this.camposDisponibles = camposDisponibles;
    }
    //se busca por el identificador
    async buscarPorIdentificador(valor, buscarDesincorporacion, identificador) {
        /**
         * valor: el valor que se va a buscar, puede ser un serial, etiqueta o mac_addre
         * buscarDesincorporacion: indica si se debe buscar en la tabla de equipos_desincorporados o en la tabla de equipos
         * identificador: el campo por el cual se va a buscar, puede ser serial, etiqueta o mac_addre
         */
        const condicion = `WHERE e.${identificador} = '${String(valor).trim()}'`;
        const consulta = (buscarDesincorporacion == 'true') ? this.retornarConsultaDesincorporado(condicion) : this.retornarConsulta(condicion);
        const resultado = await pool.query(consulta);
        return (resultado.rows.length > 0) ? resultado.rows[0] : false;
    }
    /**
     * Intenta encontrar un equipo basado en las celdas de una fila
     */
    async buscarEquipoEnFila(fila, buscarDeshabilitado = false) {
        /**
         * fila: un objeto que representa una fila del archivo, donde las claves son los nombres de las columnas y los valores son los datos de cada celda
         * buscarDeshabilitado: indica si se debe buscar en la tabla de equipos_desincorporados o en la tabla de equipos
         */
        for (let [clave, valor] of Object.entries(fila)) {
            if (!valor)
                continue;
            if (!this.camposDisponibles.includes(clave.trim().toLowerCase()))
                continue;
            for (let identificador of this.identificadores) {
                //se busca por el identificador
                const resultado = await this.buscarPorIdentificador(valor, buscarDeshabilitado, identificador);
                if (resultado) {
                    return { equipo: resultado, identificadorUsado: identificador };
                }
            }
        }
        //se hace una segunda validacion, para comprobar si se puede rastrear la fila por el id
        //se revisa si existe la columna de id
        const revision = Object.keys(fila).find(item => item.trim().toLowerCase() == 'id');
        const resultado = (revision) ? await this.buscarPorIdentificador(fila[revision], buscarDeshabilitado, 'id_equipo') : false;
        if (resultado) {
            return { equipo: resultado, identificadorUsado: 'id_equipo' };
        }
        return null;
    }
    async buscar(buscarDeshabilitado = false) {
        /**
         * buscarDeshabilitado: indica si se debe buscar en la tabla de equipos_desincorporados o en la tabla de equipos
         */
        for (let i = 0; i < this.datos.length; i++) {
            const fila = this.datos[i];
            const numFilaExcel = i + 2; // para saber el numero de fila en excel
            try {
                const hallazgo = await this.buscarEquipoEnFila(fila, buscarDeshabilitado);
                if (hallazgo) {
                    const { equipo, identificadorUsado } = hallazgo;
                    // se revisa si no se repitio un registro que ya se habia buscado, mediante el id
                    const yaExiste = this.datosObtenidos.some(e => e.id_equipo === equipo.id_equipo);
                    if (!yaExiste) {
                        // se añade el atributo que indica que indicador se tomo en cuenta
                        equipo['indicador'] = identificadorUsado;
                        this.datosObtenidos.push(equipo);
                    }
                    else {
                        // como aparecio un registro que ya se habia buscado, se señala
                        this.registrosRepetidos.push(numFilaExcel);
                    }
                }
                else {
                    // si se recorrio toda la fila y no se encontro nada
                    this.filasNoObtenidas.push(numFilaExcel);
                }
            }
            catch (error) {
                this.filasNoObtenidas.push(numFilaExcel);
            }
        }
    }
    retornarConsulta(condicion) {
        return `SELECT 
            COALESCE(us.cargo, 'S/C') AS cargo,
            c.nombre_categoria,
            COALESCE(m.nombre_marca, 'S/M') AS nombre_marca, 
            COALESCE(mo.nombre_modelo, 'S/M') AS nombre_modelo, 
            COALESCE(u.ubicacion_actual, 'S/U') AS ubicacion_actual, 
            COALESCE(us.nombre_usuario, 'S/U') AS nombre_usuario,
            COALESCE(e.serial, 'S/S') AS serial,
            COALESCE(e.etiqueta, 'S/E') AS etiqueta,
            COALESCE(e.mac_addre, 'S/M') AS mac_addre,
            COALESCE(e.notas, 'S/N') AS notas,
            e.fecha_registro,
            COALESCE(e.clave_masiva, 'S/C') AS clave_masiva, 
            COALESCE(e.clave_caja, 'S/C') AS clave_caja,
            COALESCE(e.cpu, 'desconocido') AS cpu, 
            COALESCE(e.ram, 'desconocido') AS ram, 
            COALESCE(e.pantalla, 'desconocido') AS pantalla,
            COALESCE(e.carcasa, 'desconocido') AS carcasa,
            COALESCE(e.disco_duro, 'desconocido') AS disco_duro,
            COALESCE(e.tarjeta_madre, 'desconocido') AS tarjeta_madre,
            COALESCE(e.fan_cooler, 'desconocido') AS fan_cooler,
            COALESCE(e.fuente_poder, 'desconocido') AS fuente_poder,
            e.id_equipo
            FROM equipos e
            INNER JOIN categoria c ON e.id_categoria = c.id_categoria
            LEFT JOIN marca m ON e.id_marca = m.id_marca
            LEFT JOIN modelo mo ON e.id_modelo = mo.id_modelo
            LEFT JOIN ubicaciones u ON e.id_ubicacion = u.id_ubicacion
            LEFT JOIN usuarios us ON e.id_usuario = us.cedula
            ${condicion}
            ORDER BY e.fecha_registro ASC;`;
    }
    retornarConsultaDesincorporado(condicion) {
        return `SELECT 
            COALESCE(us.cargo, 'S/C') AS cargo,
            c.nombre_categoria, 
            COALESCE(m.nombre_marca, 'S/M') AS nombre_marca, 
            COALESCE(mo.nombre_modelo, 'S/M') AS nombre_modelo, 
            COALESCE(u.ubicacion_actual, 'S/U') AS ubicacion_actual, 
            COALESCE(us.nombre_usuario, 'S/U') AS nombre_usuario,
            COALESCE(e.serial, 'S/S') AS serial,
            COALESCE(e.etiqueta, 'S/E') AS etiqueta,
            COALESCE(e.mac_addre, 'S/M') AS mac_addre,
            COALESCE(e.notas, 'S/N') AS notas,
            e.fecha_registro,
            e.fecha_desincorporacion,
            COALESCE(e.clave_masiva, 'S/C') AS clave_masiva, 
            e.id_equipo
            FROM equipos_desincorporados e
            INNER JOIN categoria c ON e.id_categoria = c.id_categoria
            LEFT JOIN marca m ON e.id_marca = m.id_marca
            LEFT JOIN modelo mo ON e.id_modelo = mo.id_modelo
            LEFT JOIN ubicaciones u ON e.id_ubicacion = u.id_ubicacion
            LEFT JOIN usuarios us ON e.id_usuario = us.cedula
            ${condicion}
            ORDER BY e.fecha_registro ASC;`;
    }
}
export { BuscarIdentificadores };
//# sourceMappingURL=AnalizarArchivo.js.map
//# sourceMappingURL=AnalizarArchivo.js.map