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

import { DataStore, DataStream, DataStoreGetResult, DataStorePutResult } from '@tbd54566975/dwn-sdk-js';
import { Readable } from 'readable-stream';
import { Bucket, Storage } from '@google-cloud/storage';

export class DataStoreGcs implements DataStore {
  private bucket: Bucket; //Declare the bucket property
  // @todo: Need to use config value
  bucketName = 'gcda-dwn-datastore-test';
  dataStoreFolder = 'dataStore';

  constructor() {

    //Initialize the storage property
    // Uses --adc application default credentials to connect to GCS
    const storage = new Storage();

    //Initialize the bucket
    this.bucket = storage.bucket(this.bucketName);
  }

  async open(): Promise<void> {
    
    //Return if the bucket is not set.
    if (!this.bucket) {
      const err = new Error("Error: bucket is not set");
      return Promise.reject(err);
    }
    return Promise.resolve();

  }

  async close(): Promise<void> {

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
  async put(
    tenant: string,
    recordId: string,
    dataCid: string,
    dataStream: Readable
  ): Promise<DataStorePutResult> {

    //Return if the bucket is not set.
    if (!this.bucket) {
      const err = new Error("Error: bucket is not set");
      return Promise.reject(err);
    }
    //Set filename for this message, under this tenant namespace
    const file = this.bucket.file(
      `${this.dataStoreFolder}/${tenant}/${recordId}_${dataCid}`
    );

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
    } else {

        // metadata can only hold a JSON representation of the array
        const metadataObj =  {
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
        console.error(`${ file.name }: Error storage file write.`);
        console.error(`${ file.name }: ${JSON.stringify(err)}`);
        reject(err);
      });
      writeStream.on('finish', () => {
        console.error(`${ file.name }: File finished writing.`);
        resolve({
          dataCid: metadataObj.dataCid,
          dataSize: data.length,
        });
      });
      
      //Upload buffer
      writeStream.write(data);
      writeStream.end();
    })
  }

  /**
   * Fetches the specified data.
   * The returned dataCid and returned dataSize will be verified against the given dataCid (and inferred dataSize).
   * @param tenant tenant id.
   * @param recordId CID of the message that references the data.
   * @param dataCid data CID.
   */
  async get(
    tenant: string,
    recordId: string,
    dataCid: string
  ): Promise<DataStoreGetResult | undefined> {
    
    //Return if the bucket is not set.
    if (!this.bucket) {
      const err = new Error("Error: bucket is not set");
      return Promise.reject(err);
    }

    //Get filename for requested dataCid on requested tenant
    const file = this.bucket.file(
      `${this.dataStoreFolder}/${tenant}/${recordId}_${dataCid}`//?NOTE: Folders don't exist on gcs, this is just a namespace for the tenant
    );

    var fileExists = (await file.exists())[0];
    if(!fileExists) { 
        console.log("Error: requested dataCid does not exist");
        return undefined;
        //const err = new Error("Error: requested dataCid does not exist");
        //return Promise.reject(err);
    }

    //Pipe the internalReadable to the readableStream
    const readStream = file.createReadStream() as Readable;
    const [metadata] = await file.getMetadata();

    //Type assertions to cast metadata values into proper types
    var gcsDataCid = "";
    var gcsDataSize = 0;
    if (metadata.metadata) {
      if(metadata.metadata["dataCid"]) {
        gcsDataCid = metadata.metadata["dataCid"] as string;
      }
      if(metadata.metadata["dataSize"]) {
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
  async delete(tenant: string, recordId: string, dataCid: string): Promise<void> {
    //Return if the bucket is not set.
    if (!this.bucket) {
      const err = new Error("Error: or bucket is not set");
      return Promise.reject(err);
    }

    //Get filename for requested dataCid on requested tenant
    const file = this.bucket.file(
      `${this.dataStoreFolder}/${tenant}/${recordId}_${dataCid}`//?NOTE: Folders don't exist on gcs, this is just a namespace for the tenant
    );

    var fileExists = (await file.exists())[0];
    //if(!fileExists) { 
    //    const err = new Error("Error: requested dataCid does not exist: " + fileExists + ", " + file.name);
    //    return Promise.reject(err);
    //}
    // if the file exists, delete.  If not, it's already been removed or deleted and don't need to error out 
    if(fileExists) { 
      file.delete();
    }

    // Resolve promise
    return Promise.resolve();
  }


  async clear(): Promise<void> {
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
    })

    //Resolve the function
    return Promise.resolve();
  }

}