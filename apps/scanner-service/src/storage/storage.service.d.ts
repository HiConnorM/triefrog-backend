import { OnModuleInit } from '@nestjs/common';
export declare class StorageService implements OnModuleInit {
    private readonly logger;
    private readonly client;
    constructor();
    onModuleInit(): Promise<void>;
    ensureBucket(bucket: string): Promise<void>;
    putObject(bucket: string, key: string, data: string): Promise<void>;
    getObject(bucket: string, key: string): Promise<string>;
}
//# sourceMappingURL=storage.service.d.ts.map