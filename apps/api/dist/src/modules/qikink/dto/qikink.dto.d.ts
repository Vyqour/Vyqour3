export declare class QikinkWebhookDto {
    event?: string;
    event_type?: string;
    order_id?: string | number;
    order_number?: string;
    status?: string;
    awb?: string;
    tracking_number?: string;
    courier?: string;
    data?: Record<string, unknown>;
}
export declare class MapQikinkSkuDto {
    qikinkSku?: string;
    qikinkPrintTypeId?: number;
    qikinkDesignCode?: string;
    qikinkDesignUrl?: string;
    qikinkMockupUrl?: string;
    qikinkPlacementSku?: string;
    qikinkSearchFromMyProducts?: number;
}
