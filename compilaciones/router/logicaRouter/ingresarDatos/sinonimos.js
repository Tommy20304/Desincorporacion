/* SE RETORNA LOS SINONIMOS NECESARIOS PARA EL CODIGO: SINONIMOS DE DATOS Y SINONIMOS DE COLUMNAS */
class sinonimos {
    //sinonimos de datos
    static sinonimosDatos() {
        let sinonimos = { categoria: {
                "computadora portatil": "COMPUTADOR PORTATIL",
                "computadora de escritorio": "COMPUTADOR ESCRITORIO",
                'pc': 'COMPUTADOR ESCRITORIO',
                'laptop': 'COMPUTADOR PORTATIL',
                'escritorio': 'COMPUTADOR ESCRITORIO',
                'portatil': 'COMPUTADOR PORTATIL',
                'cpu': "COMPUTADOR ESCRITORIO"
            },
            marca: {},
            modelo: {},
            ubicaciones: {},
            condicion: { "desincorporacion": "EN DESINCORPORACION" } };
        return sinonimos;
    }
    //sinonimos de columnas
    static sinonimosColumnas() {
        let sinonimos = {
            categoria: ["categoria", "equipos", "equipo", "descripcion del bien", 'descripción del bien'],
            marca: ["marca"],
            modelo: ["modelo"],
            etiqueta: ["etiqueta", "n° de bien", "n° del bien"],
            serial: ["serial", "n° de serial"],
            mac_addre: ["mac address", "mac_addre", 'direccion mac'],
            ubicaciones: ["ubicacion actual", "ubicacion", "ubicación", "ubicación actual"],
            notas: ["obs", "observacion", "o", "notas"],
            bueno: ["bueno", "buen estado", "aprobado", "buenas condiciones", "buenos"],
            malo: ["malo", "malos", "defectuosos", "mal estado"]
        };
        return sinonimos;
    }
}
export default sinonimos;
//# sourceMappingURL=sinonimos.js.map