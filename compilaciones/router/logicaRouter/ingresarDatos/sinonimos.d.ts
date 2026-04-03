declare class sinonimos {
    static sinonimosDatos(): {
        categoria: {
            "computadora portatil": string;
            "computadora de escritorio": string;
            pc: string;
            laptop: string;
            escritorio: string;
            portatil: string;
            cpu: string;
        };
        marca: {};
        modelo: {};
        ubicaciones: {};
        condicion: {
            desincorporacion: string;
        };
    };
    static sinonimosColumnas(): {
        categoria: string[];
        marca: string[];
        modelo: string[];
        etiqueta: string[];
        serial: string[];
        mac_addre: string[];
        ubicaciones: string[];
        notas: string[];
        bueno: string[];
        malo: string[];
    };
}
export default sinonimos;
//# sourceMappingURL=sinonimos.d.ts.map