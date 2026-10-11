"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QikinkModule = void 0;
const common_1 = require("@nestjs/common");
const qikink_api_client_1 = require("./client/qikink-api.client");
const qikink_job_queue_1 = require("./queue/qikink-job.queue");
const qikink_service_1 = require("./qikink.service");
const qikink_worker_1 = require("./qikink.worker");
const qikink_controller_1 = require("./qikink.controller");
let QikinkModule = class QikinkModule {
};
exports.QikinkModule = QikinkModule;
exports.QikinkModule = QikinkModule = __decorate([
    (0, common_1.Module)({
        controllers: [qikink_controller_1.QikinkController],
        providers: [qikink_api_client_1.QikinkApiClient, qikink_job_queue_1.QikinkJobQueue, qikink_service_1.QikinkService, qikink_worker_1.QikinkWorker],
        exports: [qikink_service_1.QikinkService, qikink_job_queue_1.QikinkJobQueue, qikink_api_client_1.QikinkApiClient],
    })
], QikinkModule);
//# sourceMappingURL=qikink.module.js.map