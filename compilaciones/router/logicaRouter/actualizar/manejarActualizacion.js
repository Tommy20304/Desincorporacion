class ManejarActualizacion {
    columnas;
    condicionComponentes;
    listaComponentes;
    datos;
    constructor(datos) {
        this.columnas = {
            'categoria': 'id_categoria',
            'marca': 'id_marca',
            'modelo': 'id_modelo',
            'etiqueta': 'etiqueta',
            'serial': 'serial',
            'mac_addre': 'mac_addre',
            'usuario': 'id_usuario',
            'ubicaciones': 'id_ubicacion',
            'notas': 'notas'
        };
        this.condicionComponentes = ['bueno', 'malo'];
        this.listaComponentes = ["cpu", "ram", "pantalla", "carcasa", "disco duro", "tarjeta madre", "fan cooler", "fuente de poder"];
        this.datos = datos;
    }
    //se retorna el valor de la mac con los guiones
    macGuiones(valor) {
        const macConGuiones = valor.split('').reduce((acc, letter, index) => {
            acc.push(letter.toUpperCase());
            if (((Number(index) + 1) % 2) == 0 && valor.split('')[Number(index) + 1])
                acc.push('-');
            return acc;
        }, []);
        return macConGuiones.join("");
    }
    //se acomoda las columnas de datosReemplazar para sean las columnas de la base de datos
    acomodarColumnas(verificar) {
        /**
         * verificar: es una instancia de la clase VerificarArchivo, se necesita para acceder a las columnas encontradas, los sinonimos y los datos sin considerar
         */
        //para sacar la posicion del nombre de cada columna
        let valores = Object.values(verificar.columnasEncontradas);
        return this.datos.map(row => {
            let newRow = {};
            for (let [clave, valor] of Object.entries(row)) {
                let valor_ = String(valor).trim();
                //se determina si es un valor sin, si lo es, se pasa
                if (verificar.retornarDatosSin().includes(valor_.toLowerCase()))
                    continue;
                //se determina el indice del nombre de la columna
                const indice = valores.indexOf(clave);
                if (indice != -1) {
                    //se define el nombre
                    const nombreColumna = Object.keys(verificar.columnasEncontradas)[indice];
                    //se comprueba si es una columna de componentes
                    let condicion = this.condicionComponentes.find((element) => element == nombreColumna);
                    if (condicion) {
                        //se recolecta las columnas de componentes
                        this.listaComponentes.forEach(component => {
                            if (valor_.toLowerCase().includes(component)) {
                                component = component == 'fuente de poder' ? component.replace(" de ", "_") : component.replace(" ", "_");
                                newRow[component] = condicion;
                            }
                        });
                        continue;
                    }
                    //si es alguna de estas columnas se hace esto     
                    if (["categoria", "marca", "modelo", "ubicaciones"].includes(nombreColumna)) {
                        //se saca el id del valor
                        let id = verificar.listaObjeto[nombreColumna].items[valor_.toUpperCase()];
                        //si el id es nulo, se determina el sinonimo
                        if (!id) {
                            let valorSinonimo = verificar.sinonimosDatos[nombreColumna][valor_.toLowerCase()];
                            id = verificar.listaObjeto[nombreColumna].items[String(valorSinonimo).toUpperCase()];
                        }
                        newRow[this.columnas[nombreColumna]] = id;
                        continue;
                    }
                    //si es una mac_addre, se le coloca los guiones
                    valor_ = (nombreColumna == 'mac_addre') ? this.macGuiones(valor_) : valor_;
                    //si es un serial se le coloca mayusculas
                    valor_ = (nombreColumna == 'serial') ? valor_.toUpperCase() : valor_;
                    //si no pasa por estas condicionales, se define asi
                    newRow[this.columnas[nombreColumna]] = valor_;
                }
            }
            return newRow;
        });
    }
    //se determina si esta la columna del id, que sirve para indicar que registro es el que se va a actualizar
    determinarColumnaId(ids) {
        /**
         * ids: es un arreglo con los id de los equipos que se van a actualizar, se necesita para comparar con los id del excel, en caso de que exista la columna de id
         */
        const columnas = Object.keys(this.datos[0]);
        //se revisa si esta la columna de id
        let revisionColumna = columnas.find((item) => item.trim().toLowerCase() == 'id');
        let filasNoCompatibles = [];
        let ids_excel = {};
        //si esta la columna, se saca la informacion
        if (revisionColumna) {
            this.datos.forEach((_, index) => {
                let id = String(this.datos[index][revisionColumna]).trim(); //el id del excel
                if (!ids.includes(id)) {
                    filasNoCompatibles.push(Number(index) + 2);
                    return;
                }
                ids_excel[index] = id;
            });
            return { filasNoCompatibles: filasNoCompatibles, ids_excel: ids_excel, nombreColumnaID: revisionColumna };
        }
        return false;
    }
}
export { ManejarActualizacion };
//# sourceMappingURL=manejarActualizacion.js.map