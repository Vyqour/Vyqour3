export declare class PaginationDto {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
}
export declare function paginate(page?: number, limit?: number): {
    skip: number;
    take: number;
    page: number;
    limit: number;
};
export declare function paginationMeta(total: number, page: number, limit: number): {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
};
