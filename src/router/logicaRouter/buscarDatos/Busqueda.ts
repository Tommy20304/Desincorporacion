import pool from "../../../database/conexionDatabase.js"; //se importa la conexion a la base de datos
class BuscarDatos {
    opciones;
    resultadoBusqueda;
    columnasCondicionales; //el nombre de las columnas con sus alias para el WHERE de la consulta
    constructor(opciones) {
        this.opciones = opciones;
        this.resultadoBusqueda = null;
        this.columnasCondicionales = {
            categoria: "c.id_categoria",
            marca: "m.id_marca",
            modelo: "mo.id_modelo",
            serial: "e.serial",
            etiqueta: "e.etiqueta",
            ubicacion: "u.id_ubicacion",
            mac_addre: "e.mac_addre",
            usuario: "us.cedula",
            clave_masiva: "e.clave_masiva",
            clave_caja: "e.clave_caja",
            id_equipo: 'e.id_equipo',
            cargo: "us.cargo"
        };
    }
    /**
     * Retorna la estructura base de la consulta SQL (SELECT + JOINS)
     */
    private obtenerConsultaBase(): string {
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
            LEFT JOIN usuarios us ON e.id_usuario = us.cedula`;
    }
    private obtenerConsultaDeshabilitada(): string {
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
            LEFT JOIN usuarios us ON e.id_usuario = us.cedula`;
    }

    /**
     * Procesa los filtros de componentes (bueno, malo, extraviado)
     */
    private procesarComponentes(clave: string, valores: string[]): string {
        /**
         * clave: la clave del componente
         * valores: un array de componentes a filtrar, por ejemplo ['cpu', 'ram'] para componenteBueno, o ['pantalla'] para componenteMalo
         */

        const estados: Record<string, string> = {
            componenteBueno: 'bueno',
            componenteMalo: 'malo'
        };

        const estado = estados[clave];
        return valores
            .filter(v => v) // Elimina nulos/vacíos
            .map(v => {
                const column = (v == 'fuente de poder') ? v.replace(' de ', '_') : v.replace(/\s+/g, '_');
                return `e.${column} = '${estado}'`
            })
            .join(" AND ");
    }

    armarConsulta(buscarDeshabilitado = null): string {
        const filtros: string[] = [];

        for (let [clave, valor] of Object.entries(this.opciones)) {
            let valor_:any = valor;
            if (!valor || (Array.isArray(valor) && valor.length === 0) || clave === "fecha_registroDespues") {
                continue; // si el valor es nulo, si no tiene nada o si tiene esa clave, se anula
            }

            // Manejo de Fechas
            if (clave === "fecha_registroAntes") {
                if (!this.opciones.fecha_registroDespues) {
                    filtros.push(`e.fecha_registro::date = '${valor}'`); // el date transformar el dato, cortando la hora
                } else {
                    filtros.push(`e.fecha_registro BETWEEN '${valor}' AND '${this.opciones.fecha_registroDespues}'`);
                }
                continue;
            }

            if (clave === "fecha_desincorporacionAntes") {
                if (!this.opciones.fecha_fecha_desincorporacionDespues) {
                    filtros.push(`e.fecha_desincorporacion::date = '${valor}'`); // el date transformar el dato, cortando la hora
                } else {
                    filtros.push(`e.fecha_desincorporacion BETWEEN '${valor}' AND '${this.opciones.fecha_desincorporacionDespues}'`);
                }
                continue;
            }

            // Manejo de Componentes
            if (["componenteBueno", "componenteMalo"].includes(clave)) {
                const clausulaComponente = this.procesarComponentes(clave, valor_);
                if (clausulaComponente) filtros.push(clausulaComponente);
                continue;
            }

            // Manejo de Columnas Estándar
            const columnaAsignada = this.columnasCondicionales[clave];
            if (columnaAsignada) {
                const necesitaComillas = ['serial', 'etiqueta', 'mac_addre', 'clave_masiva', 'clave_caja', 'cargo'].includes(clave);
                const valorFormateado = necesitaComillas ? `'${valor}'` : valor;
                filtros.push(`${columnaAsignada} = ${valorFormateado}`);
            }
        }

        const stringCondicional = filtros.length > 0 ? `WHERE ${filtros.join(" AND ")}` : "";
        const consulta = buscarDeshabilitado ? this.obtenerConsultaDeshabilitada() : this.obtenerConsultaBase();


        return `${consulta} ${stringCondicional} ORDER BY e.fecha_registro ASC;`;
    }

    async buscar(activarDeshabilitado = false) {
        const consulta = this.armarConsulta(activarDeshabilitado);
        this.resultadoBusqueda = await pool.query(consulta);
    }
}
export default BuscarDatos;
//# sourceMappingURL=Busqueda.js.map