import { TestSuite } from "@tbd54566975/dwn-sdk-js/tests";

// Remove when we Node.js v18 is no longer supported by this project.
// Node.js v18 maintenance begins 2023-10-18 and is EoL 2025-04-30: https://github.com/nodejs/release#release-schedule
import { webcrypto } from 'node:crypto';

// @ts-expect-error ignore type mismatch
if (!globalThis.crypto) globalThis.crypto = webcrypto;


// Test two different implementations of EventStream
import { EventEmitterStream } from "../src/eventemitter-stream-pubsub.js";

describe('EventEmitterStream', () => {
  TestSuite.runInjectableDependentTests({
    eventStream: new EventEmitterStream()
  });
});
