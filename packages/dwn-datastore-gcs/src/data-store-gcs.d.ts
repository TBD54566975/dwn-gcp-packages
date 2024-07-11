/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { DataStore, DataStoreGetResult, DataStorePutResult } from '@tbd54566975/dwn-sdk-js';
import { Readable } from 'readable-stream';
export declare class DataStoreGcs implements DataStore {
    private bucket;
    bucketName: string;
    dataStoreFolder: string;
    constructor();
    open(): Promise<void>;
    close(): Promise<void>;
    /**
     * Put call to save data to GCS
     * @param tenant tenant id.
     * @param recordId CID of the message that references the data.
     * @param dataCid CID of the data
     * @param dataStream stream of the data to save
     */
    put(tenant: string, recordId: string, dataCid: string, dataStream: Readable): Promise<DataStorePutResult>;
    /**
     * Uploads the data
     * Separate async function so it can be called with await
     * @param dataStream tenant id.
     * @param data CID of the message that references the data.
     * @param metadataObj metadata
     * @param file GCS representation of the file
     */
    streamFileUpload(dataStream: any, data: any, metadataObj: any, file: any): Promise<unknown>;
    /**
     * Fetches the specified data.
     * The returned dataCid and returned dataSize will be verified against the given dataCid (and inferred dataSize).
     * @param tenant tenant id.
     * @param recordId CID of the message that references the data.
     * @param dataCid data CID.
     */
    get(tenant: string, recordId: string, dataCid: string): Promise<DataStoreGetResult | undefined>;
    /**
     * Clears the entire store. Mainly used for cleaning up in test environment.
     */
    delete(tenant: string, recordId: string, dataCid: string): Promise<void>;
    clear(): Promise<void>;
}
//# sourceMappingURL=data-store-gcs.d.ts.map