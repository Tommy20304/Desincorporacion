declare class BuscarIdentificadores {
    datos: any;
    datosObtenidos: any;
    identificadores: any;
    filasNoObtenidas: any;
    registrosRepetidos: any;
    camposDisponibles: any;
    constructor(datos: any, camposDisponibles: any);
    private buscarPorIdentificador;
    /**
     * Intenta encontrar un equipo basado en las celdas de una fila
     */
    private buscarEquipoEnFila;
    buscar(buscarDeshabilitado?: boolean): Promise<void>;
    retornarConsulta(condicion: string): string;
    retornarConsultaDesincorporado(condicion: string): string;
}
export { BuscarIdentificadores };
//# sourceMappingURL=AnalizarArchivo.d.ts.map