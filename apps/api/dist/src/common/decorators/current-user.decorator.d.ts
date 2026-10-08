export type AuthUser = {
    id: string;
    email: string;
    role: string;
};
export declare const CurrentUser: (...dataOrPipes: (keyof AuthUser | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;
