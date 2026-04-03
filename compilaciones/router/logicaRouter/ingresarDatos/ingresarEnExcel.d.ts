declare class CrearObjetos {
    objetos: any;
    inicializar(): Promise<this>;
    listaObjetos(lista: any): Promise<void>;
}
declare class VerificarDatos {
    objeto: any;
    listaComponentes: any;
    sinonimosColumnas: any;
    sinonimosDatos: any;
    listaObjeto: any;
    listaErrores: any;
    ColumnasDefinitivas: any;
    columnasEtiquetaSerial: any;
    componentes: any;
    constructor(datos: any, listaObjeto: any);
    retornarLetra(indice: any): string;
    retornarDatosSin(): string[];
    retornarSinonimosEstado(): {
        bueno: string[];
        malo: string[];
        extraviado: string[];
    };
    ingresarDatosSinonimos(clave: any, keys: any, columna: any, dato: any): void;
    retornarColumnaCategorias(columnas: any): string;
    ingresarEtiquetaSerial(columna: any, posicion: any): void;
    ingresarListaError(error: any, indice: any, dato: any, paraComponente?: any): void;
    comprobarEncabezados(): false | any[];
    DeterminarDatos(): boolean;
    ComprobarOtrosEncabezados(NombreColumna: any, dato: any): string | false;
    EtiquetaSerialRepetido(date: any, lista: any, columna: any, coordenada: any): boolean;
    determinarComponentes(): void;
    DeterminarPresencia(): Promise<void>;
    mostrarSeleccion(): any;
}
declare class ingresarDatos {
    datos: any;
    listaObjetos: any;
    listaColumnas: any;
    sinonimos: any;
    verificar: any;
    fechas: any;
    nombreArchivo: any;
    constructor(datos: any, listaObjetos: any, verificar: any, nombreArchivo: any);
    ComprobarCategoriaNula(): boolean;
    comprobarErrores(dato: any, columna: any): boolean;
    recorrerDatos(): Promise<void>;
    ingresarLosDatos(datos: any): Promise<void>;
    eliminarDatos(): Promise<void>;
}
export { VerificarDatos, CrearObjetos, ingresarDatos };
//# sourceMappingURL=ingresarEnExcel.d.ts.map