import pool from "../../../database/conexionDatabase.ts"; //se importa la conexion a la base de datos
class sinonimos {
    static retornarSinonimos() {
        let sinonimos = { categoria: {}, marca: {}, modelo: {},
            ubicaciones: {}, condicion: { "desincorporacion": "EN DESINCORPORACION" } };
        return sinonimos;
    }
    static sinonimosColumnas() {
        let sinonimos = { categoria: ["categoria", "equipos"], marca: ["marca"], modelo: ["modelo"], etiqueta: ["etiqueta", "n° de bien", "n° del bien"],
            serial: ["serial", "n° de serial"], ubicaciones: ["ubicacion actual", "ubicacion", "ubicación"], condicion: ["estado", "condicion"], notas: ["obs", "observacion", "o", "notas"]
        };
        return sinonimos;
    }
}
class Seleccion {
    nombreTabla;
    valor;
    nombresColumnas;
    resultConsulta = [];
    items;
    keys;
    constructor(nombreTabla) {
        this.nombreTabla = nombreTabla;
        this.items = "algo";
        this.keys = null;
        this.resultConsulta = [];
        this.valor = "";
        this.nombresColumnas = { categoria: ["id_categoria", "nombre_categoria"], marca: ["id_marca", "nombre_marca"], modelo: ["id_modelo", "nombre_modelo"],
            ubicaciones: ["id_ubicacion", "ubicacion_actual"], condicion: ["id_condicion", "nombre_condicion"]
        };
    }
    async realizarOperacion() {
        try {
            let columnas = null;
            for (let [clave, valor] of Object.entries(this.nombresColumnas)) {
                if (clave == this.nombreTabla) {
                    columnas = valor;
                    break;
                }
            }
            let consulta = `SELECT ${columnas[0]}, ${columnas[1]} FROM ${this.nombreTabla}`;
            let result = await pool.query(consulta); //retorna la consulta
            this.resultConsulta = result.rows;
        }
        catch (e) {
            this.items = "error";
            this.keys = String(e);
        }
    }
    item() {
        let item = {};
        let id = null;
        for (let i of this.resultConsulta) {
            for (let [clave, valor] of Object.entries(i)) {
                let valor_ = valor;
                if (typeof valor_ == "number") {
                    id = valor_;
                    continue;
                }
                item[valor_] = id;
            }
        }
        this.items = item;
    }
    key() {
        let key = [];
        for (let i of this.resultConsulta) {
            for (let [clave, valor] of Object.entries(i)) {
                if (typeof valor == "string") {
                    key.push(valor);
                }
            }
        }
        this.keys = key;
    }
}
class CrearObjetos {
    objetos;
    // Este método ahora asegura que los datos existan antes de devolverlos
    async inicializar() {
        await this.listaObjetos(["categoria", "marca", "modelo", "ubicaciones", "condicion"]);
        return this; // Retornamos la instancia para encadenar
    }
    async listaObjetos(lista) {
        let objetoContenedor = {};
        for (let element of lista) {
            const seleccion = new Seleccion(element);
            await seleccion.realizarOperacion();
            // Llamamos a los métodos que procesan los resultados después del await
            seleccion.item();
            seleccion.key();
            objetoContenedor[element] = seleccion;
        }
        this.objetos = objetoContenedor;
    }
}
class VerificarDatos {
    objeto;
    listaComponentes; //lista de los componentes
    sinonimosColumnas;
    sinonimosDatos;
    listaObjeto;
    listaErrores;
    ColumnasDefinitivas;
    columnasEtiquetaSerial;
    componentes;
    constructor(datos, listaObjeto) {
        this.objeto = datos;
        this.listaComponentes = ["cpu", "ram", "pantalla", "carcasa", "disco duro", "tarjeta madre", "fan cooler", "fuente de poder"];
        this.sinonimosColumnas = sinonimos.sinonimosColumnas();
        this.sinonimosDatos = sinonimos.retornarSinonimos();
        this.listaObjeto = listaObjeto;
        this.ColumnasDefinitivas = {};
        this.listaErrores = {};
        this.componentes = {}; //aqui se ingresaran los componentes que aparecieron en el excel
        this.columnasEtiquetaSerial = {}; //se usa para determinar cuales columnas se van a usar en el metodo determinarPresencia
        // IMPORTANTE: Quitamos la llamada a listaObjetos del constructor
    }
    retornarLetra(indice) {
        let lista = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S",
            "T", "U", "V", "W", "X", "Y", "Z"
        ];
        return lista[indice];
    }
    retornarDatosSin() {
        return ["s/e", "s/m", "s/s", "s/u", "s/c", "s/e"];
    }
    retornarSinonimosEstado() {
        //retorna el sinonimo de los estados de los componentes
        let sinonimos = { bueno: ["bueno", "buen estado", "aprobado", "buenas condiciones", "buenos"],
            malo: ["malo", "malos", "defectuosos", "mal estado"],
            extraviado: ["estraviado", "extraviados", "no presentes", "desaparecidos", "no posee"]
        };
        return sinonimos;
    }
    ingresarDatosSinonimos(clave, keys, columna, dato) {
        //ingresa datos a los sinonimos
        if (clave != "ubicaciones")
            return;
        //importante: solo que agregara a los sinonimos, si la columna del momento coincide con algun sinonimo de columna de la clave
        for (let nombre of this.sinonimosColumnas[clave]) {
            if (columna.toLowerCase().includes(nombre)) {
                //se revisa que haya datos de la clave que tengan el dato del excel
                let revision = keys.find((element) => dato.toLowerCase().includes(element.toLowerCase()));
                if (revision && revision != dato.toUpperCase())
                    this.sinonimosDatos[clave][dato.toLowerCase()] = revision;
            }
        }
    }
    retornarColumnaCategorias(columnas) {
        //retorna la letra de la columna de categorias, para determinar errores en la clase de ingresar datos
        let valores = Object.values(columnas);
        if (valores.includes("categoria")) {
            let indice = valores.indexOf("categoria");
            return this.retornarLetra(indice);
        }
    }
    ingresarEtiquetaSerial(columna, posicion) {
        if (columna == "etiqueta" || columna == "serial") {
            let keys = Object.keys(this.columnasEtiquetaSerial);
            if (keys.includes(columna)) {
                let indice = keys.indexOf(columna);
                this.columnasEtiquetaSerial[keys[indice]] = "repetido"; //se indica que la columna esta repetida
                return;
            }
            this.columnasEtiquetaSerial[columna] = posicion;
        }
    }
    ingresarListaError(error, indice, dato, paraComponente = null) {
        //ingresa los errores al objeto errores
        //el parametro paraComponente, se usa para mandar el string o el dato de la celda del excel en donde proviene los componentes
        let keys = Object.keys(this.listaErrores);
        if (error.includes("componente repetido en")) {
            if (keys.includes(error)) {
                if (Object.keys(this.listaErrores[error]).includes(indice)) {
                    this.listaErrores[error][indice][0].push(dato);
                    this.listaErrores[error][indice][1] = [...this.listaErrores[error][indice][1], ...paraComponente];
                }
                else {
                    this.listaErrores[error][indice] = [[dato], paraComponente];
                }
            }
            else {
                this.listaErrores[error] = { [indice]: [[dato], paraComponente] };
            }
            return;
        }
        if (keys.includes(error)) {
            this.listaErrores[error][indice] = dato;
        }
        else {
            this.listaErrores[error] = { [indice]: dato };
        }
    }
    comprobarEncabezados() {
        let listaEncabezados = Object.keys(this.objeto[0]);
        let columnasNoContadas = [];
        //se comprueba si se repite una columna y si la hay, se elimina la columna repetida del objeto
        if (Object.keys(this.listaErrores).includes("columna repetida")) {
            for (let [clave, valor] of Object.entries(this.listaErrores["columna repetida"])) {
                if (Object.values(this.ColumnasDefinitivas).includes(clave)) {
                    let indice = Object.values(this.ColumnasDefinitivas).indexOf(clave);
                    let nombre = Object.keys(this.ColumnasDefinitivas)[indice];
                    delete this.ColumnasDefinitivas[nombre];
                }
            }
        }
        let listaDefinitiva = Object.values(this.ColumnasDefinitivas); //se instancia la variable
        for (let i of listaEncabezados) {
            if (!listaDefinitiva.includes(i)) {
                //se determina si tiene un _, indicando que se repitio el nombre de la columna
                if (i.includes("_")) {
                    let indiceGuion = i.indexOf("_");
                    let columnaRepetida = i.substring(0, indiceGuion);
                    if (listaEncabezados.includes(columnaRepetida))
                        i = columnaRepetida;
                }
                columnasNoContadas.push(i);
            }
        }
        if (columnasNoContadas.length > 0) {
            return columnasNoContadas;
        }
        return false;
    }
    DeterminarDatos() {
        let claves = Object.keys(this.objeto[0]);
        let ColumnasCompletas = []; //array que almacena todas los nombres de las columnas, que fueron definidas, para verificar si se repitio una columnas
        let dato;
        let coor; //las coordenadas del dato 
        for (let i = 0; i < claves.length; i++) {
            let listaDatos = {};
            let datosNoContados = {}; //almacena los datos que no cuentan, para determinar despues si hay datos que no pertenecen a una columna
            let datosNulos = []; //con el unico objetivo de comprobar que no hayan datos nulos en las categorias
            for (let filas = 0; filas < this.objeto.length; filas++) {
                coor = this.retornarLetra(i) + String(filas + 2);
                let contador = 0;
                let indice = this.objeto[filas]; //el dato
                dato = indice[claves[i]];
                if (!dato) {
                    datosNulos.push(coor);
                    continue;
                }
                dato = String(dato);
                //se comprueba que el dato(un strin) contenga componentes y que no sea de la columna notas
                let estadoComponente; //se almacenara el estado del componente, si es bueno, malo, dependiendo del nombre de la columna
                let componentes = []; //array donde se almacenara los componentes en la celda del excel
                for (let componente of this.listaComponentes) {
                    if (componente == this.listaComponentes[0]) { //esto solo se ejecutara en la primera iteracion
                        //se determina el estado del componente
                        for (let [clave, valor] of Object.entries(this.retornarSinonimosEstado())) {
                            let revision = valor.find((element) => claves[i].includes(element)); //se revisa si hay un sinonimo en la columna
                            if (revision) {
                                estadoComponente = clave;
                            }
                        }
                    }
                    if (!estadoComponente)
                        break; //si no se declaro el estado se anula
                    if (dato.toLocaleLowerCase().includes(componente))
                        componentes.push(componente);
                }
                if (componentes.length > 0) {
                    if (!Object.keys(listaDatos).includes(estadoComponente)) {
                        listaDatos[estadoComponente] = [1, { [coor]: dato }]; //se guarda como tercer elemento de la lista, los componentes de cada celda
                        this.componentes[estadoComponente] = [[componentes], this.retornarLetra(i), claves[i], [dato], [filas + 2]]; //se ingresa en el atributo de componentes
                    }
                    else {
                        listaDatos[estadoComponente][0] += 1;
                        listaDatos[estadoComponente][1][coor] = dato; //se agregan datos si ya existe
                        this.componentes[estadoComponente][0].push(componentes); // se ingresa en el atributo de componentes
                        this.componentes[estadoComponente][3].push(dato); //se ingresa el dato a la lista de los datos del atributo
                        this.componentes[estadoComponente][4].push(filas + 2); //se ingresa la fila, que sirve para la comparacion de componentes entre columnas
                    }
                    continue;
                }
                for (let [clave, valor] of Object.entries(this.listaObjeto)) {
                    let valor_ = valor; //se crea una nueva variable para que no haya problemas con el unknown
                    this.ingresarDatosSinonimos(clave, valor_.keys, claves[i], dato); //se ingresan datos a los sinonimos si cumplen las condiciones
                    if (valor_.keys.includes(dato.toUpperCase()) || //se compruba si el dato esta en el key o en los sinonimos, usando some que devuelve true si el callback es correcto
                        valor_.keys.some((element) => Object.keys(this.sinonimosDatos[valor_.nombreTabla]).includes(dato.toLowerCase()))) {
                        if (!Object.keys(listaDatos).includes(valor_.nombreTabla)) {
                            listaDatos[valor_.nombreTabla] = [1, { [coor]: dato }]; //se guarda el numero de veces que aparece, y una lista donde se guarda las coordenadas en excel
                        }
                        else {
                            listaDatos[valor_.nombreTabla][0] += 1;
                            listaDatos[valor_.nombreTabla][1][coor] = dato; //se agregan datos si ya existe
                        }
                        contador = 1;
                        break;
                    }
                }
                if (!contador) {
                    let resultado = this.ComprobarOtrosEncabezados(claves[i], dato);
                    if (resultado) {
                        if (resultado == "error") {
                            //si hay algun error se ingresa como posible
                            this.ingresarListaError("posible Dato no valido para la columna " + claves[i], coor, dato);
                        }
                        else {
                            if (!Object.keys(listaDatos).includes(resultado)) {
                                listaDatos[resultado] = [1, { coor: dato }];
                            }
                            else {
                                listaDatos[resultado][0] += 1;
                                listaDatos[resultado][1][coor] = dato; //se agregan datos si ya existe
                            }
                        }
                    }
                    else {
                        if (!this.retornarDatosSin().includes(dato.toLowerCase())) {
                            datosNoContados[coor] = dato; //se almacena en el objeto
                        }
                        else {
                            datosNulos.push(coor); //si los datos son s/c se añaden
                        }
                    }
                }
            }
            if (Object.keys(listaDatos).length > 0) {
                //se determina que cual es el contador mayor
                let keys = Object.keys(listaDatos);
                let contadores = [];
                for (let [clave, valor] of Object.entries(listaDatos)) {
                    let valor_ = valor;
                    contadores.push(valor_[0]);
                }
                let valorMaximo = Math.max(...contadores);
                let indexMaximo = contadores.indexOf(valorMaximo);
                let claveMaxima = keys[indexMaximo];
                this.ingresarEtiquetaSerial(claveMaxima, i);
                //se revisa si hay elemento es esta variable
                if (Object.keys(datosNoContados).length > 0) { //si hay datos que no contaron
                    for (let [clave, valor] of Object.entries(datosNoContados)) {
                        this.ingresarListaError("dato no valido para la columna " + claves[i], clave, valor);
                    }
                }
                //se comprueba si se repitio una columna
                if (ColumnasCompletas.includes(claveMaxima)) {
                    let ColumnaOriginal = ColumnasCompletas.indexOf(claveMaxima);
                    let listaRepeticion = (this.listaErrores["columna repetida"]) ? this.listaErrores["columna repetida"] : []; //esto se hace para que en el momento del find no de error
                    let revision = Object.keys(listaRepeticion);
                    if (revision.includes(claveMaxima)) {
                        let indice = revision.indexOf(claveMaxima);
                        this.listaErrores["columna repetida"][revision[indice]].push(this.retornarLetra(i)); //se añade esta columna a la lista
                    }
                    else {
                        this.ingresarListaError("columna repetida", claves[ColumnaOriginal], [this.retornarLetra(ColumnaOriginal), this.retornarLetra(i)]);
                    }
                    continue; //cuando se detecte, se pasa
                }
                else {
                    //si no hay columnas repetidas, se comprueba si hay datos nulos en la columna categoria
                    if (claveMaxima == "categoria" && datosNulos.length > 0) {
                        for (let coor of datosNulos) {
                            this.ingresarListaError("Datos nulos en la columna de categorias", coor, null);
                        }
                    }
                }
                //se comprueba si solo hay una clave maxima
                if (Object.keys(listaDatos).length === 1) {
                    this.ColumnasDefinitivas[claveMaxima] = claves[i];
                }
                else {
                    for (let [clave, valor] of Object.entries(listaDatos)) {
                        let valor_ = valor;
                        if (clave != claveMaxima) {
                            for (let [coor, dato] of Object.entries(valor_[1])) {
                                this.ingresarListaError("dato no valido para la columna " + claves[i], coor, dato);
                            }
                        }
                        if (["bueno", "malo", "extraviado"].includes(clave))
                            delete this.componentes[clave]; //si aparece aca, se elimina
                    }
                    this.ColumnasDefinitivas[claveMaxima] = claves[i]; //esto se hace para que, si se mandan los datos con errores, no haya fallas con las columnas que no se cuentan
                }
                //se guarda la columna
                ColumnasCompletas.push(claveMaxima);
            }
            else {
                ColumnasCompletas.push(claves[i]); //si la columna no es valida igual se guarda, para que no haya errores con las coordenadas
            }
        }
        if (Object.keys(this.listaErrores).length > 0) {
            return false;
        }
        return true;
    }
    ComprobarOtrosEncabezados(NombreColumna, dato) {
        //para evitar las columnas que tengan el _(numero)
        let nombreColumna = "";
        for (let element of NombreColumna) {
            if (element == "_")
                break;
            nombreColumna += element;
        }
        if (this.retornarDatosSin().includes(dato.toLowerCase()) && !this.sinonimosColumnas.notas.includes(nombreColumna.toLowerCase())) {
            return false;
        }
        const digitosEncontrados = dato.match(/\d+/g);
        if (digitosEncontrados == dato && dato.length > 3) {
            //determinamos si el nombre de la columna es serial, si no lo es se pone como etiqueta
            let valorRetornar = (this.sinonimosColumnas.serial.includes(nombreColumna.toLowerCase().trim())) ? "serial" : "etiqueta";
            return valorRetornar;
        }
        else if (this.sinonimosColumnas.serial.includes(nombreColumna.toLowerCase().trim())) { //se comprueba si esta en la columna serial
            let signos = [":", ".", "/", "-", "_", "'", "´", "@", "#", ",", ";", "¿", "!", "?", "+", " "];
            //se va a recorre el array de signos para determinar si el string contiene algunos de estos
            let revision = signos.find((element) => dato.includes(element));
            if (revision)
                return "error";
            let datoMinuscula = dato.toLowerCase();
            // la condicion que determina si hay digitos en el string dentro de esta variable
            let tieneDigitos = /\d/.test(datoMinuscula);
            // Buscamos 4 o más consonantes seguidas (difícil de pronunciar en español)
            const consonantesSeguidas = /[^aeiouáéíóúü]{3,}/.test(datoMinuscula);
            if (consonantesSeguidas)
                return "serial";
            // buscamos mas de 3 vocales seguidas
            const vocalesSeguidas = /[aeiouáéíóúü]{3,}/.test(datoMinuscula);
            if (vocalesSeguidas)
                return "serial";
            //se determina si hay digitos solo se cumplan estas condicion
            if (tieneDigitos && /[aeiouáéíóúü]{2,}/.test(datoMinuscula))
                return "serial";
            if (tieneDigitos && /[aeiouáéíóúü]{2,}/.test(datoMinuscula))
                return "serial";
            return "error";
        }
        else if (this.sinonimosColumnas.notas.includes(nombreColumna.toLowerCase())) {
            return "notas";
        }
        else {
            return false;
        }
    }
    EtiquetaSerialRepetido(date, lista, columna, coordenada) {
        //se compruea si el serial o la etiqueta se repite y se añade a los errores
        if (this.retornarDatosSin().includes(date.toLowerCase()))
            return false; //si se cumple no se ejecuta la funcion
        let clave = Object.keys(lista);
        if (clave.includes(date)) {
            let coorOriginal = lista[date];
            let listaRepeticion = (this.listaErrores["valor repetido en " + columna]) ? this.listaErrores["valor repetido en " + columna] : []; //esto se hace para que en el momento del find no de error
            let datosRepetidos = Object.keys(listaRepeticion); //todas las claves del objeto de del error valor repetido
            if (datosRepetidos.includes(date)) {
                let indice = datosRepetidos.indexOf(date);
                this.listaErrores["valor repetido en " + columna][datosRepetidos[indice]].push(coordenada); //se añade la coordenada
            }
            else {
                this.ingresarListaError("valor repetido en " + columna, date, [coorOriginal, coordenada]);
            }
            return false;
        }
        return true;
    }
    determinarComponentes() {
        //determina que no se repitan componentes
        //se revisa y se elimina las columnas repetidas
        if (this.listaErrores['columna repetida']) {
            for (let column of Object.values(this.listaErrores['columna repetida'])) {
                let column_ = column;
                //se revisa si una columna de componente aparece aqui
                let diagnostico = Object.keys(this.componentes).find((key) => column_.includes(this.componentes[key][1]));
                if (diagnostico) {
                    //se elimina la columna que se repitio
                    delete this.componentes[diagnostico];
                }
            }
        }
        if (Object.keys(this.componentes).length <= 1)
            return; //si el dato es vacio o solo tiene un atributo;
        //se determina si se repitio un componente en diferentes columnas
        let cantidadFilas = Object.keys(this.objeto[0]).length;
        let revision;
        for (let i = 0; i < cantidadFilas; i++) {
            for (let element in Object.keys(this.componentes)) {
                let element_ = Number(element); //para que el element sea numerico
                let clave = Object.keys(this.componentes);
                //se determina que ya no haya datos en la lista
                if (!clave[element_ + 1])
                    break;
                if (clave[element_ + 2] && this.componentes[clave[element_]][4].includes(this.componentes[clave[element_ + 2]][4][i])) {
                    //se revisa que si hay coincidencias entre el primero y el tercero
                    let indexCelda = this.componentes[clave[element_]][4].indexOf(this.componentes[clave[element_ + 2]][4][i]); //el index en la lista de la primera celda 
                    let fila = this.componentes[clave[element_ + 2]][4][i]; //la fila, para crear las coordenadas de los errores
                    let revisar = this.componentes[clave[element_]][0][indexCelda].filter((date) => this.componentes[clave[element_ + 2]][0][i].includes(date));
                    if (revisar) {
                        for (let datos of revisar) {
                            if (revision) {
                                if (revision.includes(datos))
                                    continue;
                            }
                            let mensajeError = `componente repetido en ${this.componentes[clave[element_]][2]} y ${this.componentes[clave[element_ + 2]][2]}`;
                            let listCoordenadas = [this.componentes[clave[element_]][1] + (fila), this.componentes[clave[element_ + 2]][1] + (fila)];
                            let listaDatosCombinados = [this.componentes[clave[element_]][3][indexCelda], this.componentes[clave[element_ + 2]][3][i]];
                            this.ingresarListaError(mensajeError, datos, listCoordenadas, listaDatosCombinados);
                        }
                    }
                }
                //si un numero de fila no coincide con otro se anula
                if (!this.componentes[clave[element_]][4].includes(this.componentes[clave[element_ + 1]][4][i]))
                    continue;
                //se recopila los datos repetidos de las dos primeras claves, si las hay
                let indexCelda = this.componentes[clave[element_]][4].indexOf(this.componentes[clave[element_ + 1]][4][i]);
                let datosRepetidos = this.componentes[clave[element_]][0][indexCelda].filter((date) => this.componentes[clave[element_ + 1]][0][i].includes(date));
                if (datosRepetidos.length > 0) {
                    //se determina si hay una tercera clave, si la hay revisa los datos repetidos para comprobar si tambien los tiene
                    if (clave[element_ + 2] && this.componentes[clave[element_ + 1]][4][i] == this.componentes[clave[element_ + 2]][4][i]) {
                        revision = this.componentes[clave[element_ + 2]][0][i].filter((date) => datosRepetidos.includes(date)); //se revisa si hay datos que coinciden;
                        let fila = this.componentes[clave[element_ + 2]][4][i];
                        if (revision) {
                            revision.forEach((date) => {
                                let mensajeError = `componente repetido en ${this.componentes[clave[element_]][2]}, ${this.componentes[clave[element_ + 1]][2]} y
                                ${this.componentes[clave[element_ + 2]][2]}`;
                                let listCoordenadas = [this.componentes[clave[element_]][1] + (fila), this.componentes[clave[element_ + 1]][1] + (fila),
                                    this.componentes[clave[element_ + 2]][1] + (fila)];
                                let listaDatosCombinados = [this.componentes[clave[element_]][3][indexCelda], this.componentes[clave[element_ + 1]][3][i],
                                    this.componentes[clave[element_ + 2]][3][i]];
                                this.ingresarListaError(mensajeError, date, listCoordenadas, listaDatosCombinados);
                            });
                        }
                    }
                    for (let date of datosRepetidos) {
                        let fila = this.componentes[clave[element_ + 1]][4][i];
                        if (revision) { //si se hizo la revision de la tercera clave, solo los datos que no aparecen se pondran   
                            if (revision.includes(date))
                                continue;
                        }
                        let mensajeError = `componente repetido en ${this.componentes[clave[element_]][2]} y ${this.componentes[clave[element_ + 1]][2]}`;
                        let listCoordenadas = [this.componentes[clave[element_]][1] + (fila), this.componentes[clave[element_ + 1]][1] + (fila)];
                        let listaDatosCombinados = [this.componentes[clave[element_]][3][indexCelda], this.componentes[clave[element_ + 1]][3][i]];
                        this.ingresarListaError(mensajeError, date, listCoordenadas, listaDatosCombinados);
                    }
                }
            }
        }
    }
    async DeterminarPresencia() {
        let objeto = Object.fromEntries(//este metodo convierte el resultado de los parentesis de nuevo en un objeto
        Object.entries(this.columnasEtiquetaSerial).filter(([claves, valor]) => valor != "repetido"));
        if (Object.keys(objeto).length > 0) {
            let claves = Object.keys(this.objeto[0]);
            let dato;
            let coor;
            for (let [clave, valor] of Object.entries(objeto)) {
                let valor_ = valor;
                let listaDato = {}; //recopila todos los datos, para comprobar que no se repiten
                for (let filas = 0; filas < this.objeto.length; filas++) {
                    dato = this.objeto[filas][claves[valor_]];
                    coor = this.retornarLetra(valor) + String(filas + 2);
                    if (!dato)
                        continue; //si el dato es nulo, no se hace la consulta
                    if (this.EtiquetaSerialRepetido(String(dato), listaDato, clave, coor))
                        listaDato[dato] = coor;
                    let consulta = `SELECT ${clave} FROM equipos WHERE ${clave} = '${dato}'`;
                    let result = await pool.query(consulta); //retorna la consulta
                    if (result.rowCount) {
                        this.ingresarListaError("dato ya existente", coor, dato);
                    }
                }
            }
        }
    }
    mostrarSeleccion() {
        return this.listaObjeto;
    }
}
;
class ingresarDatos {
    datos;
    listaObjetos;
    listaColumnas;
    sinonimos;
    verificar;
    fechas;
    nombreArchivo;
    constructor(datos, listaObjetos, verificar, nombreArchivo) {
        this.datos = datos;
        this.listaObjetos = listaObjetos;
        this.listaColumnas = { serial: "serial", etiqueta: "etiqueta", notas: "notas", categoria: "id_categoria",
            marca: "id_marca", modelo: "id_modelo", condicion: "id_condicion", ubicaciones: "id_ubicacion" };
        //para saber las columnas definitivas, para saltaer las innecesarias
        this.sinonimos = verificar.sinonimosDatos;
        this.verificar = verificar;
        this.fechas = []; //para guardar las fechas para eliminar los datos que se mandaron si hay algun error;
        this.nombreArchivo = nombreArchivo; //para poner la clave_excel, cuando se manda un archivo
    }
    ComprobarCategoriaNula() {
        //se comprueba que en la lista errores haya datos de la columna de categorias
        let claves = Object.keys(this.verificar.listaErrores);
        let letraColumna = this.verificar.retornarColumnaCategorias(this.verificar.ColumnasDefinitivas); //la letra de la columna categorias
        if (claves.includes("Datos nulos en la columna de categorias"))
            return true;
        for (let [clave, lista] of Object.entries(this.verificar.listaErrores)) {
            for (let [coor, date] of Object.entries(lista)) {
                if (clave == "columna repetida") {
                    if (date[0].includes(letraColumna))
                        return true;
                }
                let primeraLetra = coor.substring(0, 1); //se accede a la primera letra de la coordenada, que seria la letra de la columna
                if (letraColumna == primeraLetra)
                    return true;
            }
        }
        return false;
    }
    comprobarErrores(dato, columna) {
        let columnasExcel = Object.keys(this.verificar.objeto[0]);
        for (let [clave, lista] of Object.entries(this.verificar.listaErrores)) {
            if (clave.includes("posible"))
                continue; //si hay un posible error de anula
            for (let [coor, date] of Object.entries(lista)) {
                if (clave == "columna repetida") {
                    let indice = columnasExcel.indexOf(columna);
                    if (date.includes(this.verificar.retornarLetra(indice)))
                        return true;
                }
                if (clave === "valor repetido en serial" || clave === "valor repetido en etiqueta") {
                    if (Object.keys(lista).includes(dato))
                        return true;
                }
                if (clave == "dato ya existente" && String(date) === dato)
                    return true; //para cuando hay datos ya existentes
                if (clave.includes(columna) && String(date) === dato)
                    return true; //para cuando hay errores en la columna tal
            }
        }
        return false;
    }
    async recorrerDatos() {
        for (let filas of this.datos) {
            const hora = new Date().toISOString().slice(0, 19).replace('T', ' '); //la hora
            let datosIngresar = { fecha_registro: hora, clave_masiva: this.nombreArchivo };
            for (let [columna, dato] of Object.entries(filas)) {
                //se comprueba que los datos son errores o no
                let dato_ = dato;
                if (this.comprobarErrores(String(dato_), columna))
                    continue;
                if (this.verificar.retornarDatosSin().includes(String(dato_).toLowerCase()))
                    continue;
                if (Object.values(this.verificar.ColumnasDefinitivas).includes(columna)) { //si una de las columnas esta en las columnas definitivas
                    let indice = Object.values(this.verificar.ColumnasDefinitivas).indexOf(columna);
                    let clave = Object.keys(this.verificar.ColumnasDefinitivas)[indice];
                    if (["categoria", "marca", "modelo", "ubicaciones", "condicion"].includes(clave)) {
                        if (!this.listaObjetos[clave].keys.includes(String(dato_).toUpperCase())) {
                            let datoSinonimo = this.sinonimos[clave][dato_.toLowerCase()]; //se retorna el dato segun los sinonimos
                            datosIngresar[this.listaColumnas[clave]] = this.listaObjetos[clave].items[datoSinonimo];
                        }
                        else {
                            datosIngresar[this.listaColumnas[clave]] = this.listaObjetos[clave].items[dato_.toUpperCase()];
                        }
                    }
                    else {
                        //primero se comprueba que la columna no sea una de componentes, si no es, se pasa normal
                        let revision;
                        for (let [key, valor] of Object.entries(this.verificar.retornarSinonimosEstado())) {
                            let valor_ = valor;
                            revision = valor_.find((element) => columna.includes(element));
                            if (revision)
                                break;
                        }
                        if (!revision)
                            datosIngresar[clave] = dato;
                    }
                }
            }
            for (let [estado, componente] of Object.entries(this.verificar.componentes)) {
                let index = this.datos.indexOf(filas); //el index de la fila, para determina de que fila son los componentes
                //se recorre las filas de la columna del componente, para comprobar si la fila que se esta recorriendo coincide
                for (let file in componente[4]) {
                    if (componente[4][file] == (index + 2)) {
                        //se guarda en el datosIngresar, usando los componentes como columnas para poder ingresar
                        componente[0][file].forEach((element) => {
                            if (element == "fuente de poder")
                                element = element.replace(" de ", "_"); //se reemplaza eso
                            else if (element.includes(" "))
                                element = element.replace(" ", "_"); //se remplaza el espacio
                            datosIngresar[element] = estado;
                        });
                    }
                }
            }
            if (Object.keys(datosIngresar).length > 1) {
                await this.ingresarLosDatos(datosIngresar);
                this.fechas.push(hora);
            }
        }
    }
    async ingresarLosDatos(datos) {
        let stringColumnas = "(";
        let stringIndicadores = "(";
        for (let i in Object.keys(datos)) {
            let numero = Number(i) + 1;
            stringColumnas = stringColumnas + Object.keys(datos)[i] + ",";
            stringIndicadores = stringIndicadores + "$" + numero + ",";
        }
        stringColumnas = stringColumnas.substring(0, (stringColumnas.length - 1));
        stringIndicadores = stringIndicadores.substring(0, (stringIndicadores.length - 1));
        stringColumnas += ")";
        stringIndicadores += ")";
        let consulta = "INSERT INTO equipos" + stringColumnas + " VALUES" + stringIndicadores;
        await pool.query(consulta, Object.values(datos));
    }
    async eliminarDatos() {
        let fechasContadas = []; //para que no se repite una eliminacion;
        for (let i of this.fechas) {
            if (fechasContadas.includes(i))
                continue;
            let consultas = `DELETE FROM equipos WHERE fecha_registro = '${i}'`;
            await pool.query(consultas);
            fechasContadas.push(i);
        }
    }
}
export { VerificarDatos, CrearObjetos, ingresarDatos };
//# sourceMappingURL=ingresarEnExcel.js.map
//# sourceMappingURL=ingresarEnExcel.js.map