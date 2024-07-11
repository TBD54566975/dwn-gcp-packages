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
import { DataStream } from '@tbd54566975/dwn-sdk-js';
import { Storage } from '@google-cloud/storage';
export class DataStoreGcs {
    bucket; //Declare the storage bucket property
    bucketName;  // Storage bucket name
    dataStoreFolder = 'dataStore';
    constructor() {
        //Initialize the storage property
        // Uses --adc application default credentials to connect to GCS
        const storage = new Storage();
        //Initialize the bucket
        this.bucketName = process.env.DWN_GCS_BUCKET_NAME;
        this.bucket = storage.bucket(this.bucketName);
    }
    async open() {
        //Return if the bucket is not set.
        if (!this.bucket) {
            const err = new Error("Error: bucket is not set.  Check env variable DWN_GCS_BUCKET_NAME");
            return Promise.reject(err);
        }
        return Promise.resolve();
    }
    async close() {
        /*There is no need to explicitly close the Storage object after usage.
        The Storage instance manages its connections and resources internally,
        and Node.js's garbage collection will handle the cleanup.*/
        return Promise.resolve();
    }
    /**
     * Put call to save data to GCS
     * @param tenant tenant id.
     * @param recordId CID of the message that references the data.
     * @param dataCid CID of the data
     * @param dataStream stream of the data to save
     */
    async put(tenant, recordId, dataCid, dataStream) {
        //Return if the bucket is not set.
        if (!this.bucket) {
            const err = new Error("Error: bucket is not set");
            return Promise.reject(err);
        }
        //Set filename for this message, under this tenant namespace
        const file = this.bucket.file(`${this.dataStoreFolder}/${tenant}/${recordId}_${dataCid}`);
        //Transfrom stream to buffer
        const bytes = await DataStream.toBytes(dataStream);
        const data = Buffer.from(bytes);
        var fileExists = (await file.exists())[0];
        //If it exists, else add
        if (fileExists) {
            // return file, no reason to write the data again
            return Promise.resolve({
                dataCid: dataCid,
                dataSize: data.length,
            });
        }
        else {
            // metadata can only hold a JSON representation of the array
            const metadataObj = {
                tenant: tenant,
                dataCid: dataCid,
                dataSize: data.length
            };
            // upload to GCS
            const result = await this.streamFileUpload(dataStream, data, metadataObj, file).catch(console.error);
        }
        //Resolve promise by returning PutResult
        return Promise.resolve({
            dataCid: dataCid,
            dataSize: data.length,
        });
    }
    /**
     * Uploads the data
     * Separate async function so it can be called with await
     * @param dataStream tenant id.
     * @param data CID of the message that references the data.
     * @param metadataObj metadata
     * @param file GCS representation of the file
     */
    async streamFileUpload(dataStream, data, metadataObj, file) {
        return new Promise((resolve, reject) => {
            const writeStream = file.createWriteStream({
                resumable: false,
                metadata: {
                    metadata: metadataObj
                }
            });
            writeStream.on('error', (err) => {
                console.error(`${file.name}: Error storage file write.`);
                console.error(`${file.name}: ${JSON.stringify(err)}`);
                reject(err);
            });
            writeStream.on('finish', () => {
                console.error(`${file.name}: File finished writing.`);
                resolve({
                    dataCid: metadataObj.dataCid,
                    dataSize: data.length,
                });
            });
            //Upload buffer
            writeStream.write(data);
            writeStream.end();
        });
    }
    /**
     * Fetches the specified data.
     * The returned dataCid and returned dataSize will be verified against the given dataCid (and inferred dataSize).
     * @param tenant tenant id.
     * @param recordId CID of the message that references the data.
     * @param dataCid data CID.
     */
    async get(tenant, recordId, dataCid) {
        //Return if the bucket is not set.
        if (!this.bucket) {
            const err = new Error("Error: bucket is not set");
            return Promise.reject(err);
        }
        //Get filename for requested dataCid on requested tenant
        const file = this.bucket.file(`${this.dataStoreFolder}/${tenant}/${recordId}_${dataCid}` //?NOTE: Folders don't exist on gcs, this is just a namespace for the tenant
        );
        var fileExists = (await file.exists())[0];
        if (!fileExists) {
            console.log("Error: requested dataCid does not exist");
            return undefined;
            //const err = new Error("Error: requested dataCid does not exist");
            //return Promise.reject(err);
        }
        //Pipe the internalReadable to the readableStream
        const readStream = file.createReadStream();
        const [metadata] = await file.getMetadata();
        //Type assertions to cast metadata values into proper types
        var gcsDataCid = "";
        var gcsDataSize = 0;
        if (metadata.metadata) {
            if (metadata.metadata["dataCid"]) {
                gcsDataCid = metadata.metadata["dataCid"];
            }
            if (metadata.metadata["dataSize"]) {
                gcsDataSize = Number(metadata.metadata["dataSize"]);
            }
        }
        //Resolve promise
        return Promise.resolve({
            dataCid: gcsDataCid,
            dataSize: gcsDataSize,
            dataStream: readStream
        });
    }
    /**
     * Clears the entire store. Mainly used for cleaning up in test environment.
     */
    async delete(tenant, recordId, dataCid) {
        //Return if the bucket is not set.
        if (!this.bucket) {
            const err = new Error("Error: or bucket is not set");
            return Promise.reject(err);
        }
        //Get filename for requested dataCid on requested tenant
        const file = this.bucket.file(`${this.dataStoreFolder}/${tenant}/${recordId}_${dataCid}` //?NOTE: Folders don't exist on gcs, this is just a namespace for the tenant
        );
        var fileExists = (await file.exists())[0];
        if (!fileExists) {
            const err = new Error("Error: requested dataCid does not exist");
            return Promise.reject(err);
        }
        //Delete the file and resolve promise
        file.delete();
        return Promise.resolve();
    }
    async clear() {
        //Return if the bucket is not set.
        if (!this.bucket) {
            const err = new Error("Error: bucket is not set");
            return Promise.reject(err);
        }
        //List all files in the bucket
        this.bucket.getFiles()
            .then(([files]) => {
            const deletePromises = files.map(file => file.delete());
            //Wait for all delete promises to resolve
            return Promise.all(deletePromises);
        });
        //Resolve the function
        return Promise.resolve();
    }
}
//# sourceMappingURL=data-store-gcs.js.map