declare class CrearObjetos {
    objetos: any;
    inicializar(): Promise<this>;
    listaObjetos(lista: any): Promise<void>;
}
declare class VerificacionInicial {
    objeto: any;
    listaComponentes: any;
    sinonimosColumnas: any;
    sinonimosDatos: any;
    listaObjeto: any;
    listaErrores: any;
    posibleIngreso: any;
    ColumnasDefinitivas: any;
    columnasEncontradas: any;
    columnasEtiquetaSerialMac: any;
    componentes: any;
    constructor(datos: any, listaObjeto: any);
    retornarLetra(indice: number): string;
    retornarDatosSin(): string[];
    retornarSinonimosEstado(): {
        bueno: string[];
        malo: string[];
        extraviado: string[];
    };
    ingresarDatosSinonimos(clave: string, keys: string[], columna: string, dato: string): void;
    retornarLetraColumna(nombreColumna: any): string;
    ingresarEtiquetaSerialMac(columna: string, posicion: number): void;
    ingresarListaError(error: string, indice: any, dato: any): void;
    comprobarEncabezados(): string[] | false;
    determinarColumna(nombre: string): string | false;
    determinarEtiqueta(dato: any): boolean;
    determinarMacAddre(dato: any): boolean;
    DeterminarDatos(): void;
}
declare class ComprobarExcepciones extends VerificacionInicial {
    EtiquetaSerialMacRepetido(date: string, lista: Record<string, string>, columna: string, coordenada: string): boolean;
    DeterminarPresencia(): Promise<void>;
    ComprobarColumnaNula(nombreColumna: string): boolean;
    columnaNoPresente(): string | false;
}
declare class ComprobarComponentes extends ComprobarExcepciones {
    comprobarColumnasRepetidas(): void;
    determinarComponentes(): void;
}
declare class VerificarDatos extends ComprobarComponentes {
    constructor(datos: any, listaObjeto: any);
}
declare class ingresarDatos {
    datos: any[];
    listaObjetos: any;
    listaColumnas: Record<string, string>;
    sinonimos: any;
    verificar: any;
    fechas: string[];
    nombreArchivo: string;
    id_usuario: any;
    constructor(datos: any[], listaObjetos: any, verificar: any, nombreArchivo: string, id_usuario: any);
    /**
     * Se retorna el valor de la mac con guiones
     */
    macGuiones(valor: any): string;
    /**
     * Comprueba si un dato específico en una columna tiene errores registrados previamente
     */
    comprobarErrores(dato: string, columna: string): boolean;
    /**
     * Recorre las filas procesadas y prepara el objeto final para la inserción
     */
    recorrerDatos(): Promise<void>;
    /**
     * Construye y ejecuta la consulta INSERT de forma segura
     */
    ingresarLosDatos(datos: Record<string, any>): Promise<void>;
    /**
     * Elimina registros basados en las fechas de la carga actual (Rollback manual)
     */
    eliminarDatos(): Promise<void>;
}
export { VerificarDatos, CrearObjetos, ingresarDatos };
//# sourceMappingURL=ingresarEnExcelNuevo.d.ts.map