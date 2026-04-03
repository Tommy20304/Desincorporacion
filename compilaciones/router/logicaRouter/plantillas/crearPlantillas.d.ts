import exceljs from "exceljs";
declare class FormarInfoPlanillas {
    datos: any;
    columnas: any;
    constructor(datos: any);
    retornarNombre(fila: any): any;
    retornarColumnasDisponibles(fila: any): any;
    retornarInfoSimple(): {
        nombre: string;
        fuente: string;
        'tama\u00F1o letra': number;
        descripcion: string;
        imagen: string;
        columnas: any[];
        limites: any[];
    };
    formarInfoPlantilla(): any;
    retornarRuta(archivo: any, nombre: any): string;
    retornarRutasExcel(): {};
}
declare class CrearPlantilla {
    clavePlantilla: any;
    datos: any;
    columnasPedidas: any;
    columnasRegistradas: any;
    infoPlantilla: any;
    rutaPlantilla: any;
    constructor(clavePlantilla: any, datos: any, columnasPedidas: any, infoPlantilla: any, rutaPlantilla: any);
    retornarLetra(indice: any): string;
    retornarInfoColumnas(): {
        nombre_categoria: {
            nombre: string;
            width: number;
        };
        nombre_marca: {
            nombre: string;
            width: number;
        };
        nombre_modelo: {
            nombre: string;
            width: number;
        };
        serial: {
            nombre: string;
            width: number;
        };
        etiqueta: {
            nombre: string;
            width: number;
        };
        mac_addre: {
            nombre: string;
            width: number;
        };
        nombre_condicion: {
            nombre: string;
            width: number;
        };
        fecha_registro: {
            nombre: string;
            width: number;
        };
        fecha_desincorporacion: {
            nombre: string;
            width: number;
        };
        clave_masiva: {
            nombre: string;
            width: number;
        };
        clave_caja: {
            nombre: string;
            width: number;
        };
        nombre_usuario: {
            nombre: string;
            width: number;
        };
        ubicacion_actual: {
            nombre: string;
            width: number;
        };
        bueno: {
            nombre: string;
            width: number;
        };
        notas: {
            nombre: string;
            width: number;
        };
        malo: {
            nombre: string;
            width: number;
        };
        id_equipo: {
            nombre: string;
            width: number;
        };
    };
    crearPlantilla(): Promise<exceljs.Workbook>;
    agregarRegistrosPlantilla(): Promise<exceljs.Workbook>;
    agregarRegistrosFaltantes(): Promise<exceljs.Workbook>;
    crearPlantillaSimple(): Promise<exceljs.Workbook>;
    private aplicarEstilosExcel;
}
export { CrearPlantilla, FormarInfoPlanillas };
//# sourceMappingURL=crearPlantillas.d.ts.map