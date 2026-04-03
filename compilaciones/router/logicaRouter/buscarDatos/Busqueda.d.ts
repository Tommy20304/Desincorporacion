declare class BuscarDatos {
    opciones: any;
    resultadoBusqueda: any;
    columnasCondicionales: any;
    constructor(opciones: any);
    /**
     * Retorna la estructura base de la consulta SQL (SELECT + JOINS)
     */
    private obtenerConsultaBase;
    private obtenerConsultaDeshabilitada;
    /**
     * Procesa los filtros de componentes (bueno, malo, extraviado)
     */
    private procesarComponentes;
    armarConsulta(buscarDeshabilitado?: any): string;
    buscar(activarDeshabilitado?: boolean): Promise<void>;
}
export default BuscarDatos;
//# sourceMappingURL=Busqueda.d.ts.map