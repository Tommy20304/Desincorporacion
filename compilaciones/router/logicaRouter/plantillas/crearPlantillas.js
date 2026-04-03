import exceljs from "exceljs";
class FormarInfoPlanillas {
    datos;
    columnas;
    constructor(datos) {
        this.datos = datos;
        this.columnas = { nombre: 'nombre', descripcion: 'descripcion', nombre_imagen: 'imagen', columnas_disponibles: 'columnas',
            columans_Originales: "columnasOriginales", item_maximo: 'ItemMaximo'
        };
    }
    retornarNombre(fila) {
        //se retorna el nombre de la plantilla quitando el punto
        return fila.nombre.split('.')[0];
    }
    retornarColumnasDisponibles(fila) {
        return fila.columnas_disponibles.map(objeto => JSON.parse(objeto));
    }
    retornarInfoSimple() {
        let simple = {
            'nombre': 'simple',
            'fuente': 'Arial',
            'tamaño letra': 10,
            'descripcion': 'un excel simple donde se coloca todos los datos buscados',
            'imagen': 'http://localhost:3000/imagenes/simple.png',
            'columnas': [],
            'limites': []
        };
        return simple;
    }
    formarInfoPlantilla() {
        const diseños = {};
        for (const fila of this.datos) {
            // Valores por defecto
            const descripcion = fila.descripcion || "No tiene Descripcion";
            const limite_inicial = fila.limite_inicial ?? 2;
            const nombreProcesado = this.retornarNombre(fila);
            // se forma la informacion de una planilla
            const plantilla = {
                nombre: nombreProcesado,
                descripcion: descripcion,
                imagen: this.retornarRuta("imagen", fila.nombre_imagen),
                columnas: this.retornarColumnasDisponibles(fila),
                columnasOriginales: fila.columnas_originales,
                limites: [limite_inicial, fila.limite_final],
                itemMaximo: fila.item_maximo
            };
            // se guarda
            diseños[nombreProcesado] = plantilla;
        }
        diseños['simple'] = this.retornarInfoSimple();
        return diseños;
    }
    retornarRuta(archivo, nombre) {
        /**
         * archivo: el tipo de archivo, puede ser imagen o excel
         * nombre: el nombre del archivo, sin la ruta, se asume que las imagenes son png y los excel son xlsx
         */
        const rutas = {
            imagen: "http://localhost:3000/imagenes/",
            excel: "src/plantillas excel/"
        };
        return `${rutas[archivo]}${nombre}`;
    }
    retornarRutasExcel() {
        let rutas = {};
        for (let filas of this.datos) {
            rutas[this.retornarNombre(filas)] = this.retornarRuta("excel", filas.nombre);
        }
        return rutas;
    }
}
class CrearPlantilla {
    clavePlantilla;
    datos;
    columnasPedidas;
    columnasRegistradas;
    infoPlantilla;
    rutaPlantilla;
    constructor(clavePlantilla, datos, columnasPedidas, infoPlantilla, rutaPlantilla) {
        this.clavePlantilla = clavePlantilla;
        this.datos = datos;
        this.infoPlantilla = infoPlantilla;
        this.rutaPlantilla = rutaPlantilla;
        this.columnasPedidas = columnasPedidas;
    }
    retornarLetra(indice) {
        const lista = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        return lista[indice] || "";
    }
    retornarInfoColumnas() {
        return {
            nombre_categoria: { nombre: 'categoria', width: 20 },
            nombre_marca: { nombre: 'marca', width: 18 },
            nombre_modelo: { nombre: 'modelo', width: 20 },
            serial: { nombre: 'serial', width: 30 },
            etiqueta: { nombre: 'etiqueta', width: 20 },
            mac_addre: { nombre: 'direccion mac', width: 30 },
            nombre_condicion: { nombre: 'condicion', width: 20 },
            fecha_registro: { nombre: 'fecha registro', width: 30 },
            fecha_desincorporacion: { nombre: 'fecha desincorporacion', width: 30 },
            clave_masiva: { nombre: 'clave masiva', width: 25 },
            clave_caja: { nombre: 'clave caja', width: 25 },
            nombre_usuario: { nombre: 'usuario', width: 17 },
            ubicacion_actual: { nombre: 'ubicacion actual', width: 30 },
            bueno: { nombre: 'componentes buenos', width: 30 },
            notas: { nombre: 'notas', width: 30 },
            malo: { nombre: 'componentes malos', width: 30 },
            id_equipo: { nombre: 'id del equipo', width: 20 }
        };
    }
    async crearPlantilla() {
        const libro = new exceljs.Workbook();
        await libro.xlsx.readFile(this.rutaPlantilla);
        const hoja = libro.getWorksheet(1);
        const [limiteInicial, limiteFinal] = this.infoPlantilla.limites;
        this.datos.forEach((fila, index) => {
            const rowNumber = index + limiteInicial;
            // Si alcanzamos el límite de la plantilla, nos detenemos
            if (rowNumber >= limiteFinal && limiteFinal)
                return;
            Object.entries(fila).forEach(([clave, valor]) => {
                //si posee una columna valida, se agrega los datos
                const revision = this.infoPlantilla.columnas.find(element => element[clave]);
                if (revision) {
                    const nombreColumna = Object.values(revision)[0];
                    const colIndex = this.infoPlantilla.columnasOriginales.indexOf(nombreColumna);
                    const columnLetter = this.retornarLetra(colIndex);
                    const cell = hoja.getCell(`${columnLetter}${rowNumber}`);
                    cell.value = Array.isArray(valor) ? valor.join("-") : valor;
                }
            });
        });
        return libro;
    }
    //Se agregan los registros que faltan en varias hojas con la misma plantilla que la original
    async agregarRegistrosPlantilla() {
        //se crea el libro con los datos ingresados
        const libro = await this.crearPlantilla();
        //se declara el libro y la hoja original, para despues duplicarla
        const libroOriginal = new exceljs.Workbook();
        await libroOriginal.xlsx.readFile(this.rutaPlantilla);
        const hojaOriginal = libroOriginal.getWorksheet(1);
        //se saca su modelo
        const modeloHoja = hojaOriginal.model;
        const { itemMaximo, columnas } = this.infoPlantilla;
        const [limiteInicial, limiteFinal] = this.infoPlantilla.limites;
        let nuevahoja;
        let rowNumber;
        for (let item = itemMaximo; this.datos.length > item; item++) {
            if ((item % itemMaximo) == 0) {
                const numHoja = (item / itemMaximo) + 1;
                nuevahoja = libro.addWorksheet('Hoja ' + numHoja);
                //se clona el modelo, cambiando el id y el name
                const nuevoModelo = JSON.parse(JSON.stringify(modeloHoja));
                nuevoModelo.name = nuevahoja.name;
                nuevoModelo.id = nuevahoja.id;
                //se ingresa el modelo de la hoja original con el name y el id cambiados para evitar expceciones
                nuevahoja.model = nuevoModelo;
                rowNumber = limiteInicial;
            }
            Object.entries(this.datos[item]).forEach(([clave, valor]) => {
                //si posee una columna valida, se agrega los datos
                const revision = this.infoPlantilla.columnas.find(element => element[clave]);
                if (revision) {
                    const nombreColumna = Object.values(revision)[0];
                    const colIndex = this.infoPlantilla.columnasOriginales.indexOf(nombreColumna);
                    const columnLetter = this.retornarLetra(colIndex);
                    const cell = nuevahoja.getCell(`${columnLetter}${rowNumber}`);
                    cell.value = Array.isArray(valor) ? valor.join("-") : valor;
                }
            });
            rowNumber += 1;
        }
        return libro;
    }
    // se agregan los registros que faltan en otra hoja
    async agregarRegistrosFaltantes() {
        const libro = await this.crearPlantilla();
        const nuevaHoja = libro.addWorksheet('Hoja 2');
        const { itemMaximo, columnas } = this.infoPlantilla;
        // se añaden las columnas
        nuevaHoja.columns = columnas.map(item => {
            const headerName = Object.values(item)[0];
            return {
                header: headerName.toUpperCase(),
                key: headerName,
                width: 30
            };
        });
        // se ingresa los datos sobrantes
        this.datos.forEach((fila, index) => {
            const nroRegistro = index + 1;
            // se asegura que solo recorra los datos que faltan
            if (nroRegistro <= itemMaximo)
                return;
            const rowInNewSheet = nroRegistro - itemMaximo + 1; // Ajuste para empezar en fila 2 (debajo del header)
            Object.entries(fila).forEach(([clave, valor]) => {
                //si la columna es valida se ingresa
                const revision = columnas.find(element => element[clave]);
                if (revision) {
                    const colIndex = columnas.indexOf(revision);
                    const columnLetter = this.retornarLetra(colIndex);
                    const cell = nuevaHoja.getCell(`${columnLetter}${rowInNewSheet}`);
                    cell.value = Array.isArray(valor) ? valor.join("-") : valor;
                }
            });
        });
        return libro;
    }
    async crearPlantillaSimple() {
        const libro = new exceljs.Workbook();
        const hoja = libro.addWorksheet('Simple');
        const infoColumnas = this.retornarInfoColumnas();
        // 1. Determinar y filtrar encabezados
        const columnasVisibles = Object.keys(this.datos[0] || {})
            .filter(key => {
            const info = infoColumnas[key];
            return info && this.columnasPedidas.includes(info.nombre);
        })
            .map(key => ({
            header: infoColumnas[key].nombre.toUpperCase(),
            key: infoColumnas[key].nombre,
            width: infoColumnas[key].width,
            originalKey: key // Guardamos la clave original para mapear los datos después
        }));
        hoja.columns = columnasVisibles;
        // 2. Añadir las filas procesadas
        this.datos.forEach(filaOriginal => {
            const nuevaFila = {};
            columnasVisibles.forEach(col => {
                let valor = filaOriginal[col.originalKey];
                // Lógica específica para componentes
                if (['bueno', 'malo'].includes(col.originalKey)) {
                    if (valor !== 'desconocido' && Array.isArray(valor)) {
                        valor = valor.join('-');
                    }
                }
                nuevaFila[col.key] = valor;
            });
            hoja.addRow(nuevaFila);
        });
        // 3. Aplicar Estilos (Encabezado y Cuerpo)
        this.aplicarEstilosExcel(hoja);
        return libro;
    }
    aplicarEstilosExcel(hoja) {
        /**
         * hoja: la hoja de excel a la que se le van a aplicar los estilos
         */
        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        hoja.eachRow((row, rowNumber) => {
            const esHeader = rowNumber === 1;
            row.eachCell((cell) => {
                cell.font = {
                    name: 'Arial',
                    bold: esHeader,
                    size: esHeader ? 9 : 8
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = borderStyle;
            });
        });
    }
}
export { CrearPlantilla, FormarInfoPlanillas };
//# sourceMappingURL=crearPlantillas.js.map
//# sourceMappingURL=crearPlantillas.js.map