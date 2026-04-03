declare class ManejarActualizacion {
    columnas: any;
    condicionComponentes: any;
    listaComponentes: any;
    datos: any;
    constructor(datos: any);
    macGuiones(valor: any): string;
    acomodarColumnas(verificar: any): any;
    determinarColumnaId(ids: any): false | {
        filasNoCompatibles: any[];
        ids_excel: {};
        nombreColumnaID: string;
    };
}
export { ManejarActualizacion };
//# sourceMappingURL=manejarActualizacion.d.ts.map