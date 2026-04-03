/*
    ARCHVIVO ENCARGADO DE LA RECOPILACION, COMPROBACION E IMPORTACION DE LOS DATOS ENVIADOS EN FORMATO .XLSX

*/
import pool from "../../../database/conexionDatabase.js"; //se importa la conexion a la base de datos
import sinonimos from "./sinonimos.js"; //se importa los sinonimos
class Seleccion {
    nombreTabla;
    valor;
    nombresColumnas;
    resultConsulta = [];
    items;
    keys;
    constructor(nombreTabla) {
        this.nombreTabla = nombreTabla;
        this.items = "";
        this.keys = null;
        this.resultConsulta = [];
        this.nombresColumnas = {
            categoria: ["id_categoria", "nombre_categoria"],
            marca: ["id_marca", "nombre_marca"],
            modelo: ["id_modelo", "nombre_modelo"],
            ubicaciones: ["id_ubicacion", "ubicacion_actual"]
        };
    }
    async realizarOperacion() {
        try {
            const columnas = this.nombresColumnas[this.nombreTabla];
            if (!columnas) {
                throw new Error(`La tabla ${this.nombreTabla} no está configurada.`);
            }
            const consulta = `SELECT ${columnas[0]}, ${columnas[1]} FROM ${this.nombreTabla}`;
            const result = await pool.query(consulta);
            this.resultConsulta = result.rows;
        }
        catch (e) {
            this.items = "error";
            this.keys = String(e);
        }
    }
    /**
   * Transforma los resultados en un objeto de mapeo { "Nombre": id }
   */
    generarItems() {
        const [idCol, nombreCol] = this.nombresColumnas[this.nombreTabla];
        this.items = this.resultConsulta.reduce((acc, row) => {
            const nombre = row[nombreCol];
            const id = row[idCol];
            acc[nombre] = id;
            return acc;
        }, {});
    }
    /**
     * Extrae solo los nombres (strings) de la consulta
     */
    generarKeys() {
        const [_, nombreCol] = this.nombresColumnas[this.nombreTabla];
        this.keys = this.resultConsulta.map(row => String(row[nombreCol]));
    }
}
class CrearObjetos {
    objetos;
    // Este método ahora asegura que los datos existan antes de devolverlos
    async inicializar() {
        await this.listaObjetos(["categoria", "marca", "modelo", "ubicaciones"]);
        return this; // Retornamos la instancia para encadenar
    }
    async listaObjetos(lista) {
        let objetoContenedor = {};
        for (let element of lista) {
            const seleccion = new Seleccion(element);
            await seleccion.realizarOperacion();
            // Llamamos a los métodos que procesan los resultados después del await
            seleccion.generarItems();
            seleccion.generarKeys();
            objetoContenedor[element] = seleccion;
        }
        this.objetos = objetoContenedor;
    }
}
class VerificacionInicial {
    objeto;
    listaComponentes; //lista de los componentes
    sinonimosColumnas;
    sinonimosDatos;
    listaObjeto;
    listaErrores;
    posibleIngreso;
    ColumnasDefinitivas;
    columnasEncontradas;
    columnasEtiquetaSerialMac;
    componentes;
    constructor(datos, listaObjeto) {
        this.objeto = datos;
        this.listaComponentes = ["cpu", "ram", "pantalla", "carcasa", "disco duro", "tarjeta madre", "fan cooler", "fuente de poder", "placa madre"];
        this.sinonimosColumnas = sinonimos.sinonimosColumnas();
        this.sinonimosDatos = sinonimos.sinonimosDatos();
        this.listaObjeto = listaObjeto;
        this.ColumnasDefinitivas = {};
        this.columnasEncontradas = {}; //las columnas que se reconocieron
        this.posibleIngreso = {}; //para colocar los datos de categoria, modelo y marca que pueden ser ingresados
        this.listaErrores = {};
        this.componentes = {}; //aqui se ingresaran los componentes que aparecieron en el excel
        this.columnasEtiquetaSerialMac = {}; //se usa para determinar cuales columnas se van a usar en el metodo determinarPresencia
    }
    retornarLetra(indice) {
        const lista = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        return lista[indice] || "";
    }
    retornarDatosSin() {
        return ["s/e", "s/m", "s/s", "s/u", "s/c", "s/e"];
    }
    // retorna el sinonimo de los estados de los componentes
    retornarSinonimosEstado() {
        return {
            bueno: ["bueno", "buen estado", "aprobado", "buenas condiciones", "buenos"],
            malo: ["malo", "malos", "defectuosos", "mal estado"],
            extraviado: ["estraviado", "extraviados", "no presentes", "desaparecidos", "no posee"]
        };
    }
    // ingresa datos a los sinonimos
    ingresarDatosSinonimos(clave, keys, columna, dato) {
        /**
         * clave: la clave del objeto de sinonimosDatos, que puede ser categoria, marca, modelo o ubicaciones
         * keys: las keys del objeto de la clave, por ejemplo, si la clave es categoria, keys seria un array con los nombres de las categorias
         * columna: el nombre de la columna del excel que se esta revisando en ese momento
         * dato: el dato que se esta revisando en ese momento, para determinar si se agrega a los sinonimos o no
         */
        if (clave !== "ubicaciones")
            return;
        // importante: solo que agregara a los sinonimos, si la columna del momento coincide con algun sinonimo de columna de la clave
        const sinonimosDeClave = this.sinonimosColumnas[clave] || [];
        for (const nombre of sinonimosDeClave) {
            if (columna.toLowerCase().includes(nombre)) {
                // se revisa que haya datos de la clave que tengan el dato del excel
                const revision = keys.find((element) => dato.toLowerCase().includes(element.toLowerCase()));
                if (revision && revision !== dato.toUpperCase()) {
                    this.sinonimosDatos[clave][dato.toLowerCase()] = revision;
                }
            }
        }
    }
    retornarLetraColumna(nombreColumna) {
        //retorna la letra de la columna de categorias, para determinar errores en la clase de ingresar datos
        let valores = Object.keys(this.objeto[0]); //todas las columnas del archivo
        if (valores.includes(nombreColumna)) {
            let indice = valores.indexOf(nombreColumna);
            return this.retornarLetra(indice);
        }
    }
    // se realiza la operacion en la cual, se almacena la posicion de la etiqueta, serial y mac
    ingresarEtiquetaSerialMac(columna, posicion) {
        /**
         * columna: el nombre de la columna, que puede ser etiqueta, serial o mac_addre
         * posicion: el indice de la columna en el excel, para determinar su letra y almacenarla en el objeto columnasEtiquetaSerialMac
         */
        // se realiza la operacion en la cual, se almacena la posicion de la etiqueta y serial
        if (["serial", "etiqueta", "mac_addre"].includes(columna)) {
            if (this.columnasEtiquetaSerialMac.hasOwnProperty(columna)) {
                this.columnasEtiquetaSerialMac[columna] = "repetido"; // se indica que la columna esta repetida
            }
            else {
                this.columnasEtiquetaSerialMac[columna] = posicion;
            }
        }
    }
    //ingresa los errores al objeto errores 
    ingresarListaError(error, indice, dato) {
        /**parametros
         * error: el nombre del error
         * indice: la coordenada del error o el nombre del dato que se repitio, o la primera letra de la columna que se repitio
         * dato: el dato que se ingreso en el excel o tambien puede ser las coordenadas de las columnas o datos repetidas
         */
        if (!this.listaErrores[error]) {
            this.listaErrores[error] = {};
        }
        // Caso especial para componentes repetidos
        if (error.includes("componente repetido en")) {
            if (this.listaErrores[error][indice]) {
                this.listaErrores[error][indice] = [...this.listaErrores[error][indice], ...dato];
            }
            else {
                this.listaErrores[error][indice] = dato;
            }
            return;
        }
        this.listaErrores[error][indice] = dato;
    }
    //determina cual encabezado no se va a contar   
    comprobarEncabezados() {
        //hace que si una columna se repite, esta forme parte de los campos que no se van a contar
        const listaEncabezados = Object.keys(this.objeto[0]);
        const columnasNoContadas = [];
        // comprobación de columnas repetidas
        if (this.listaErrores["columna repetida"]) {
            for (const clave of Object.keys(this.listaErrores["columna repetida"])) {
                if (Object.values(this.ColumnasDefinitivas).includes(clave)) {
                    const nombreEncontrado = Object.keys(this.columnasEncontradas).find(key => this.columnasEncontradas[key] === clave);
                    if (nombreEncontrado)
                        delete this.columnasEncontradas[nombreEncontrado];
                }
            }
        }
        const listaDefinitiva = Object.values(this.columnasEncontradas);
        //se determinara cuales columnas no se contaran
        for (let i of listaEncabezados) {
            if (!listaDefinitiva.includes(i)) {
                // se determina si tiene un _, indicando que se repitio el nombre de la columna
                if (i.includes("_")) {
                    const columnaBase = i.split("_")[0];
                    if (listaEncabezados.includes(columnaBase))
                        i = columnaBase;
                }
                columnasNoContadas.push(i);
            }
        }
        return columnasNoContadas.length > 0 ? columnasNoContadas : false;
    }
    determinarColumna(nombre) {
        /**
         * nombre: el nombre de la columna del excel que se esta revisando en ese momento
         */
        // se quita el _, cuando una columna se repite
        const nombreLimpio = nombre.split("_")[0].toLowerCase();
        // determina cual es la columna, teniendo en cuenta los sinonimos
        const revision = Object.keys(this.sinonimosColumnas).find(key => this.sinonimosColumnas[key].includes(nombreLimpio));
        if (!revision) {
            //si no se encontro nada, se hace una segunda revision para comprobar si es una columna de componente
            const condicionComponente = { bueno: this.sinonimosColumnas.bueno, malo: this.sinonimosColumnas.malo };
            for (const [key, lista] of Object.entries(condicionComponente)) {
                if (lista.some((sinonimo) => nombreLimpio.includes(sinonimo))) {
                    return key;
                }
            }
            return false;
        }
        return revision;
    }
    determinarEtiqueta(dato) {
        return /^\d+$/.test(dato) && dato.length > 3;
    }
    determinarMacAddre(dato) {
        //se hace un metodo para determinar que el dato sea par
        let datoSinGuiones = dato.replace(/-/g, ''); //el dato sin los guiones
        //si el dato sin guiones es impar, no es valido
        if (datoSinGuiones.length % 2 != 0)
            return false;
        return true;
    }
    DeterminarDatos() {
        if (this.objeto.length === 0)
            return;
        const claves = Object.keys(this.objeto[0]);
        for (let i = 0; i < claves.length; i++) {
            const datosNulos = [];
            const nombreColumna = claves[i];
            const columna = this.determinarColumna(nombreColumna.trim());
            if (!columna)
                continue;
            // se determina si se repitio el nombre de una columna
            if (this.columnasEncontradas[columna]) {
                delete this.posibleIngreso[columna];
                const letraActual = this.retornarLetra(i);
                const nombreColumnaRepetida = this.columnasEncontradas[columna];
                if (!this.listaErrores["columna repetida"])
                    this.listaErrores["columna repetida"] = {};
                if (this.listaErrores["columna repetida"][nombreColumnaRepetida]) {
                    this.listaErrores["columna repetida"][nombreColumnaRepetida].push(letraActual);
                }
                else {
                    const indiceOriginal = claves.indexOf(this.columnasEncontradas[columna]);
                    this.ingresarListaError("columna repetida", nombreColumnaRepetida, [this.retornarLetra(indiceOriginal), letraActual]);
                }
                continue;
            }
            this.columnasEncontradas[columna] = nombreColumna;
            for (let filas = 0; filas < this.objeto.length; filas++) {
                const coor = `${this.retornarLetra(i)}${filas + 2}`;
                let datoRaw = this.objeto[filas][nombreColumna];
                // se comprueba las expeciones, para pasar el dato
                if (!datoRaw || this.retornarDatosSin().includes(String(datoRaw).trim().toLowerCase())) {
                    datosNulos.push(coor);
                    continue;
                }
                const dato = String(datoRaw).trim();
                // lógicas para diccionarios
                if (["categoria", "marca", "modelo", "ubicaciones"].includes(columna)) {
                    const valorObj = this.listaObjeto[columna];
                    //se ingresa en los sinonimos si cumple la condiciones
                    if (columna === "ubicaciones") {
                        this.ingresarDatosSinonimos(columna, valorObj.keys, nombreColumna, dato);
                    }
                    const registrado = valorObj.keys.includes(dato.toUpperCase()) ||
                        this.sinonimosDatos[valorObj.nombreTabla]?.[dato.toLowerCase()];
                    if (!registrado) {
                        if (["categoria", "marca", "modelo"].includes(columna)) {
                            if (!this.posibleIngreso[columna])
                                this.posibleIngreso[columna] = [];
                            if (!this.posibleIngreso[columna].includes(dato.toUpperCase())) {
                                this.posibleIngreso[columna].push(dato.toUpperCase());
                            }
                        }
                        else {
                            this.ingresarListaError(`dato no valido para la columna ${nombreColumna}`, coor, dato);
                        }
                    }
                    continue;
                }
                if (columna === "serial")
                    continue;
                if (columna === "etiqueta") {
                    if (!this.determinarEtiqueta(dato)) {
                        this.ingresarListaError(`dato no valido para la columna ${nombreColumna}`, coor, dato);
                    }
                    continue;
                }
                if (columna === "mac_addre") {
                    if (!this.determinarMacAddre(dato)) {
                        this.ingresarListaError(`dato no valido para la columna ${nombreColumna}`, coor, dato);
                    }
                    continue;
                }
                // comprobación de componentes (bueno/malo)
                if (["bueno", "malo"].includes(columna)) {
                    const compsEncontrados = this.listaComponentes.filter(c => dato.toLowerCase().includes(c));
                    if (compsEncontrados.length) {
                        if (!this.componentes[columna]) {
                            this.componentes[columna] = [[compsEncontrados], this.retornarLetra(i), nombreColumna, [dato], [filas + 2]];
                        }
                        else {
                            this.componentes[columna][0].push(compsEncontrados);
                            this.componentes[columna][3].push(dato);
                            this.componentes[columna][4].push(filas + 2);
                        }
                        continue;
                    }
                    this.ingresarListaError(`dato no valido para la columna ${nombreColumna}`, coor, dato);
                }
            }
            // Limpieza si la columna es totalmente nula
            if (datosNulos.length === this.objeto.length) {
                delete this.columnasEncontradas[columna];
                continue;
            }
            //se guarda el indice de las columnas etiqueta, serial y mac_addere
            if (["etiqueta", "serial", "mac_addre"].includes(columna)) {
                this.ingresarEtiquetaSerialMac(columna, i);
            }
            //se compueba si hay datos nulos en categoria
            if (datosNulos.length && columna === "categoria") {
                datosNulos.forEach(c => this.ingresarListaError(`Datos nulos en la columna de ${columna}`, c, null));
            }
        }
    }
}
//verifica excepciones adicionales producto de la clase VerificacionInicial
class ComprobarExcepciones extends VerificacionInicial {
    //Se comprueba si el serial o la etiqueta se repite y se añade a los errores
    EtiquetaSerialMacRepetido(date, lista, columna, coordenada) {
        /**
         * date: el dato que se esta revisando en ese momento, para determinar si se repite o no
         * lista: la lista de los datos que se han revisado en esa columna, para determinar si el dato se repite o no
         * columna: el nombre de la columna del excel que se esta revisando en ese momento, para determinar el tipo de error que se va a ingresar en caso de que se repita el dato
         * coordenada: la coordenada del dato que se esta revisando en ese momento, para ingresar el error en caso de que se repita el dato
         */
        if (this.retornarDatosSin().includes(date.toLowerCase())) {
            return false; // si se cumple no se ejecuta la funcion
        }
        if (Object.keys(lista).includes(date)) {
            const coorOriginal = lista[date];
            const nombreError = "valor repetido en " + columna;
            // esto se hace para que en el momento del find no de error
            if (!this.listaErrores[nombreError]) {
                this.listaErrores[nombreError] = {};
            }
            const listaRepeticion = this.listaErrores[nombreError];
            const datosRepetidos = Object.keys(listaRepeticion); // todas las claves del objeto de del error valor repetido
            if (datosRepetidos.includes(date)) {
                // se añade la coordenada
                this.listaErrores[nombreError][date].push(coordenada);
            }
            else {
                this.ingresarListaError(nombreError, date, [coorOriginal, coordenada]);
            }
            return false;
        }
        return true;
    }
    async DeterminarPresencia() {
        // este metodo convierte el resultado de los parentesis de nuevo en un objeto
        const objetoValido = Object.fromEntries(Object.entries(this.columnasEtiquetaSerialMac).filter(([_, valor]) => valor !== "repetido"));
        if (Object.keys(objetoValido).length > 0) {
            const nombresColumnasArchivo = Object.keys(this.objeto[0]);
            for (const [clave, posicionColumna] of Object.entries(objetoValido)) {
                const valorPosicion = posicionColumna;
                const listaDatoTemp = {}; // recopila todos los datos, para comprobar que no se repiten
                for (let filas = 0; filas < this.objeto.length; filas++) {
                    let datoRaw = this.objeto[filas][nombresColumnasArchivo[valorPosicion]];
                    const coor = this.retornarLetra(valorPosicion) + String(filas + 2);
                    if (!datoRaw)
                        continue; // si el dato es nulo, no se hace la consulta
                    const datoStr = String(datoRaw).trim();
                    if (!this.EtiquetaSerialMacRepetido(datoStr, listaDatoTemp, clave, coor)) {
                        continue;
                    }
                    listaDatoTemp[datoStr] = coor;
                    const datoBusqueda = datoStr.toUpperCase(); // para que pueda reconocer seriales
                    // Implementación de consulta a base de datos
                    const consulta = `SELECT ${clave} FROM equipos WHERE ${clave} = '${datoBusqueda}'`;
                    const result = await pool.query(consulta); // retorna la consulta
                    if (result.rowCount > 0) {
                        // se agrega el dato a ya existente
                        this.ingresarListaError("dato ya existente", coor, datoBusqueda);
                    }
                }
            }
        }
    }
    //se comprueba que en la lista errores haya datos de la columna que se indica
    ComprobarColumnaNula(nombreColumna) {
        const clavesErrores = Object.keys(this.listaErrores);
        const letraColumna = this.retornarLetraColumna(nombreColumna); // la letra de la columna que se puso en nombreColumna
        if (clavesErrores.includes("Datos nulos en la columna de " + nombreColumna)) {
            return true;
        }
        for (const [tipoError, subLista] of Object.entries(this.listaErrores)) {
            for (const [coor, dato] of Object.entries(subLista)) {
                if (tipoError === "columna repetida") {
                    // El dato en 'columna repetida' suele ser un array de letras [letra1, letra2]
                    if (Array.isArray(dato) && dato.includes(letraColumna)) {
                        return true;
                    }
                }
                const primeraLetraCoor = coor.substring(0, 1); // se accede a la primera letra de la coordenada
                if (letraColumna === primeraLetraCoor) {
                    return true;
                }
            }
        }
        return false;
    }
    //determina la presencia del campo indispensable: categoria
    columnaNoPresente() {
        const camposIndispensables = ["categoria"];
        for (const campo of camposIndispensables) {
            if (!Object.keys(this.columnasEncontradas).includes(campo)) {
                return campo;
            }
        }
        return false;
    }
}
//comprueba los errores en los componentes
class ComprobarComponentes extends ComprobarExcepciones {
    //se revisa y se elimina las columnas repetidas
    comprobarColumnasRepetidas() {
        const erroresRepetidos = this.listaErrores['columna repetida'];
        if (erroresRepetidos) {
            // Iteramos sobre los valores de las columnas que el sistema marcó como duplicadas
            for (const column of Object.values(erroresRepetidos)) {
                const columnLetras = column;
                // Se revisa si una columna de componente aparece aquí
                const diagnostico = Object.keys(this.componentes).find((key) => columnLetras.includes(this.componentes[key][1]));
                if (diagnostico) {
                    // Se elimina la columna que se repitió para no procesar datos duplicados
                    delete this.componentes[diagnostico];
                }
            }
        }
    }
    //Determina que no se repitan componentes en diferentes estados (ej. un CPU no puede estar bueno y malo a la vez)
    determinarComponentes() {
        this.comprobarColumnasRepetidas();
        // Si el dato es vacio o solo tiene un atributo (no hay nada que comparar entre columnas)
        const keysComponentes = Object.keys(this.componentes);
        if (keysComponentes.length <= 1)
            return;
        // Se determina si se repitió un componente en diferentes columnas
        // Usamos la longitud del objeto para iterar por filas
        const cantidadFilas = this.objeto.length;
        for (let i = 0; i < cantidadFilas; i++) {
            // Comparamos las columnas de componentes entre sí (ej: bueno vs malo)
            for (let index = 0; index < keysComponentes.length; index++) {
                const claveActual = keysComponentes[index];
                const claveSiguiente = keysComponentes[index + 1];
                // Se determina que ya no haya más columnas para comparar
                if (!claveSiguiente)
                    break;
                const compActual = this.componentes[claveActual];
                const compSiguiente = this.componentes[claveSiguiente];
                // compX[4] contiene los números de fila originales del excel
                if (!compActual[4].includes(compSiguiente[4][i])) {
                    continue;
                }
                // Se recopila los datos repetidos de las dos columnas, si las hay
                const indexCelda = compActual[4].indexOf(compSiguiente[4][i]);
                // Filtramos componentes que aparecen en ambos arrays de detección ([0])
                const datosRepetidos = compActual[0][indexCelda].filter((compNombre) => compSiguiente[0][i].includes(compNombre));
                if (datosRepetidos.length > 0) {
                    for (const componenteNombre of datosRepetidos) {
                        const filaOriginal = compSiguiente[4][i];
                        const mensajeError = `componente repetido en ${compActual[2]} y ${compSiguiente[2]}`;
                        // Coordenadas: Letra de columna [1] + número de fila
                        const listCoordenadas = [
                            compActual[1] + filaOriginal,
                            compSiguiente[1] + filaOriginal
                        ];
                        this.ingresarListaError(mensajeError, componenteNombre, listCoordenadas);
                    }
                }
            }
        }
    }
}
//esta clase encapsulara todas las anteriores
class VerificarDatos extends ComprobarComponentes {
    constructor(datos, listaObjeto) {
        super(datos, listaObjeto);
    }
}
class ingresarDatos {
    datos;
    listaObjetos;
    listaColumnas;
    sinonimos;
    verificar; // Instancia de la clase de verificación
    fechas;
    nombreArchivo;
    id_usuario;
    constructor(datos, listaObjetos, verificar, nombreArchivo, id_usuario) {
        this.datos = datos;
        this.listaObjetos = listaObjetos;
        // Mapeo de columnas del excel/objeto a columnas de la base de datos
        this.listaColumnas = {
            serial: "serial",
            etiqueta: "etiqueta",
            mac_addre: "mac_addre",
            notas: "notas",
            categoria: "id_categoria",
            marca: "id_marca",
            modelo: "id_modelo",
            ubicaciones: "id_ubicacion"
        };
        this.sinonimos = verificar.sinonimosDatos;
        this.verificar = verificar;
        this.fechas = []; // para guardar las fechas para eliminar los datos que se mandaron si hay algun error;
        this.nombreArchivo = nombreArchivo; // para poner la clave_excel, cuando se manda un archivo
        this.id_usuario = id_usuario;
    }
    /**
     * Se retorna el valor de la mac con guiones
     */
    macGuiones(valor) {
        const macConGuiones = valor.split('').reduce((acc, letter, index) => {
            acc.push(letter.toUpperCase());
            if (((Number(index) + 1) % 2) == 0 && valor.split('')[Number(index) + 1])
                acc.push('-');
            return acc;
        }, []);
        return macConGuiones.join("");
    }
    /**
     * Comprueba si un dato específico en una columna tiene errores registrados previamente
     */
    comprobarErrores(dato, columna) {
        /**
         * dato: el dato que se esta revisando en ese momento, para determinar si tiene un error registrado o no
         * columna: el nombre de la columna del excel que se esta revisando en ese momento, para determinar el tipo de error que se va a revisar en caso de que el dato tenga un error registrado
         */
        const columnasExcel = Object.keys(this.verificar.objeto[0]);
        for (const [clave, lista] of Object.entries(this.verificar.listaErrores)) {
            for (const [coor, date] of Object.entries(lista)) {
                // Caso: Columnas repetidas
                if (clave === "columna repetida") {
                    const indice = columnasExcel.indexOf(columna);
                    const letraColumna = this.verificar.retornarLetra(indice);
                    if (date.includes(letraColumna))
                        return true;
                }
                // Caso: Valores repetidos en la misma carga
                if (clave.includes('valor repetido en ')) {
                    if (Object.keys(lista).includes(dato))
                        return true;
                }
                // Caso: Dato ya existente en la base de datos
                if (clave === "dato ya existente" && String(date) === dato)
                    return true;
                // Caso: Errores específicos de la columna
                if (clave.includes(columna) && String(date) === dato)
                    return true;
            }
        }
        return false;
    }
    /**
     * Recorre las filas procesadas y prepara el objeto final para la inserción
     */
    async recorrerDatos() {
        for (const filas of this.datos) {
            // Generación de marca de tiempo para el registro
            const ahora = new Date();
            const hora = ahora.toLocaleDateString() + " " + ahora.toLocaleTimeString().substring(0, 8).trim();
            let datosIngresar = {
                fecha_registro: hora,
                clave_masiva: this.nombreArchivo,
                id_usuario: this.id_usuario
            };
            for (let [columna, dato] of Object.entries(filas)) {
                const datoLimpio = String(dato).trim();
                // Validaciones de salto
                if (this.comprobarErrores(datoLimpio, columna))
                    continue;
                if (this.verificar.retornarDatosSin().includes(datoLimpio.toLowerCase()))
                    continue;
                // Si la columna fue reconocida por el verificador
                if (Object.values(this.verificar.columnasEncontradas).includes(columna)) {
                    const indice = Object.values(this.verificar.columnasEncontradas).indexOf(columna);
                    const claveInterna = Object.keys(this.verificar.columnasEncontradas)[indice];
                    // Transformación de IDs para categorías, marcas, etc.
                    if (["categoria", "marca", "modelo", "ubicaciones"].includes(claveInterna)) {
                        const listaObj = this.listaObjetos[claveInterna];
                        const datoUpper = datoLimpio.toUpperCase();
                        if (!listaObj.keys.includes(datoUpper)) {
                            const datoSinonimo = this.sinonimos[claveInterna][datoLimpio.toLowerCase()];
                            datosIngresar[this.listaColumnas[claveInterna]] = listaObj.items[datoSinonimo];
                        }
                        else {
                            datosIngresar[this.listaColumnas[claveInterna]] = listaObj.items[datoUpper];
                        }
                    }
                    else {
                        // Verificación de si la columna es un componente (basado en sinonimos de estado)
                        let esComponente = false;
                        const condicionComponente = {
                            bueno: this.verificar.sinonimosColumnas.bueno,
                            malo: this.verificar.sinonimosColumnas.malo
                        };
                        for (const [key, lista] of Object.entries(condicionComponente)) {
                            if (lista.some(sin => columna.toLowerCase().includes(sin))) {
                                esComponente = true;
                                break;
                            }
                        }
                        if (!esComponente) {
                            if (claveInterna === 'serial')
                                dato = datoLimpio.toUpperCase();
                            if (claveInterna === 'mac_addre')
                                dato = this.macGuiones(dato);
                            datosIngresar[claveInterna] = dato;
                        }
                    }
                }
            }
            // Procesamiento de componentes (Hardware)
            for (const [estado, infoComponente] of Object.entries(this.verificar.componentes)) {
                const indexFila = this.datos.indexOf(filas);
                const filasIndices = infoComponente[4];
                const componentesNombres = infoComponente[0];
                for (let i = 0; i < filasIndices.length; i++) {
                    if (filasIndices[i] === (indexFila + 2)) {
                        componentesNombres[i].forEach((nombreOriginal) => {
                            let nombreColumnaDB = nombreOriginal;
                            // Normalización de nombres de componentes para la DB (ej: "fuente de poder" -> "fuente_poder")
                            nombreColumnaDB = nombreColumnaDB === "fuente de poder" ? nombreColumnaDB.replace(" de ", "_") : nombreColumnaDB.replace(/\s+/g, "_");
                            // validacion especial si es placa madre
                            nombreColumnaDB = (nombreColumnaDB == 'placa_madre') ? 'tarjeta_madre' : nombreColumnaDB;
                            datosIngresar[nombreColumnaDB] = estado;
                        });
                    }
                }
            }
            // Inserción final si el objeto tiene más que los datos base
            if (Object.keys(datosIngresar).length > 3) {
                await this.ingresarLosDatos(datosIngresar);
                this.fechas.push(hora);
            }
        }
    }
    /**
     * Construye y ejecuta la consulta INSERT de forma segura
     */
    async ingresarLosDatos(datos) {
        /**
         * datos: un objeto con los datos ya procesados y listos para ingresar a la base de datos, donde las claves son los nombres de las columnas de la base de datos
         * y los valores son los datos a ingresar
         */
        const columnas = Object.keys(datos);
        const valores = Object.values(datos);
        // Genera los placeholders ($1, $2, $3...)
        const placeholders = columnas.map((_, i) => `$${i + 1}`).join(", ");
        const nombresColumnas = columnas.join(", ");
        const consulta = `INSERT INTO equipos (${nombresColumnas}) VALUES (${placeholders})`;
        // pool.query ahora recibe los valores por separado para mayor seguridad
        await pool.query(consulta, valores);
    }
    /**
     * Elimina registros basados en las fechas de la carga actual (Rollback manual)
     */
    async eliminarDatos() {
        // Utilizamos un Set para evitar duplicados de fechas en la eliminación
        const fechasUnicas = Array.from(new Set(this.fechas));
        for (const fecha of fechasUnicas) {
            const consulta = "DELETE FROM equipos WHERE fecha_registro = $1";
            await pool.query(consulta, [fecha]);
        }
    }
}
export { VerificarDatos, CrearObjetos, ingresarDatos };
//# sourceMappingURL=ingresarEnExcelNuevo.js.map
//# sourceMappingURL=ingresarEnExcelNuevo.js.map