declare class AgregarClave {
    datos: any;
    clave: any;
    constructor(datos: any, clave: any);
    static determinarErrorUbicacion(datos: any): boolean;
    static determinarClaveExistente(datos: any): any[];
    static determinarClave(clave: any): Promise<boolean>;
    agregarClave(): Promise<void>;
}
export { AgregarClave };
//# sourceMappingURL=agregarClave.d.ts.map