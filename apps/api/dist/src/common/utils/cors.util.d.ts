export declare function parseCorsOrigins(raw?: string | string[] | null): string[];
export declare function isDynamicDevOrigin(origin: string): boolean;
export declare function isOriginAllowed(origin: string | undefined, allowedList: string[], opts?: {
    allowAnyInDev?: boolean;
    nodeEnv?: string;
}): boolean;
export type CorsOriginCallback = (err: Error | null, origin?: boolean | string) => void;
export declare function createCorsOriginDelegate(allowedList: string[]): (origin: string | undefined, callback: CorsOriginCallback) => void;
export declare const CORS_ALLOWED_HEADERS: string[];
export declare const CORS_METHODS: string[];
