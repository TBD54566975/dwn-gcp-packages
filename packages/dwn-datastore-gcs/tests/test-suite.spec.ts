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

import { TestSuite } from '@tbd54566975/dwn-sdk-js/tests';
import { testMysqlDialect, testPostgresDialect, testSqliteDialect } from './test-dialects.js';
import { MessageStoreSql, ResumableTaskStoreSql } from '@tbd54566975/dwn-sql-store';
//import { DataStoreSql } from '@tbd54566975/dwn-sql-store/src/data-store-sql-gcs.js'; // SQL backed datastore
import { DataStoreGcs } from '../src/data-store-gcs.js'; // Updated to GCS
import { EventLogSql } from '@tbd54566975/dwn-sql-store';


// Remove when we Node.js v18 is no longer supported by this project.
// Node.js v18 maintenance begins 2023-10-18 and is EoL 2025-04-30: https://github.com/nodejs/release#release-schedule
//import { webcrypto } from 'node:crypto';
//if (!globalThis.crypto) globalThis.crypto = webcrypto;

describe('SQL Store with GCS Datastore - Test Suite', () => {

/**
  describe('MysqlDialect Support', () => {
    TestSuite.runStoreDependentTests({
      messageStore : new MessageStoreSql(testMysqlDialect),
      dataStore    : new DataStoreGcs(),
      eventLog     : new EventLogSql(testMysqlDialect),
    });
  }); 
**/

  describe('PostgresDialect Support', () => {
    TestSuite.runInjectableDependentTests({
      messageStore : new MessageStoreSql(testPostgresDialect),
      dataStore    : new DataStoreGcs(),
      eventLog     : new EventLogSql(testPostgresDialect),
      resumableTaskStore : new ResumableTaskStoreSql(testPostgresDialect),
    });
  });

/** 
  describe('SqliteDialect Support', () => {
    TestSuite.runStoreDependentTests({
      messageStore : new MessageStoreSql(testSqliteDialect),
      dataStore    : new DataStoreSql(testSqliteDialect),
      eventLog     : new EventLogSql(testSqliteDialect),
    });
  });
**/
});