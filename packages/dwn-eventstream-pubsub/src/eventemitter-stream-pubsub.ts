import type {
    EventListener,
    EventStream,
    EventSubscription,
    MessageEvent,
  } from '@tbd54566975/dwn-sdk-js';

import type { KeyValues } from './types.js';
//import { EventEmitter } from 'events';

import { DwnError, DwnErrorCode } from '@tbd54566975/dwn-sdk-js';

// import from GCP PubSub
import {PubSub, Message} from '@google-cloud/pubsub';

const EVENTS_LISTENER_CHANNEL = 'events';

export interface EventEmitterStreamConfig {
  /**
   * An optional error handler in order to be able to react to any errors or warnings triggers by `EventEmitter`.
   * By default we log errors with `console.error`.
   */
  errorHandler?: (error: any) => void;
};


export class EventEmitterStream implements EventStream {
  isOpen: boolean = false;
  projectId: string;

  constructor(config: EventEmitterStreamConfig = {}) {
    // we capture the rejections and currently just log the errors that are produced
    //this.eventEmitter = new EventEmitter({ captureRejections: true });

    // number of listeners per particular eventName before a warning is emitted
    // we set to 0 which represents infinity.
    // https://nodejs.org/api/events.html#emittersetmaxlistenersn
    //this.eventEmitter.setMaxListeners(0);

    if (config.errorHandler) {
      this.errorHandler = config.errorHandler;
    }

    this.projectId = process.env.DWN_PROJECT_ID as string;
  }

  /**
   * we subscribe to the `EventEmitter` error handler with a provided handler or set one which logs the errors.
   */
  private errorHandler: (error:any) => void = (error) => { console.error('event emitter error', error); };

  
  async subscribe(tenant: string, id: string, listener: EventListener): Promise<EventSubscription> {

    // Get topic name
    let topicName = this.getTopicName(tenant);

    // Get subscription name
    let subscriptionName = this.getSubscriptionName(tenant, id);

    if (!this.projectId) {
      const err = new Error("Error: project id is not set.  Check env variable DWN_PROJECT_ID");
      return Promise.reject(err);
    }
    let pubSubClient = new PubSub({projectId: this.projectId});
    let pubSubTopic = await pubSubClient.topic(topicName);

    // Is there a case where a subscribe happens before the topic is created?  Should we create topic or error out?
    let topicExists: any;
    try { 
      [topicExists] = await pubSubTopic.exists();
    } catch(e) {
      console.log("Error topic exists: " + topicName);
    }

    if(!topicExists) {
      try{
        [pubSubTopic] =  await pubSubClient.createTopic(topicName);
        //console.log(`Topic created ${topicName}`);
      } catch(e) {
        console.log("Error creating topic: " + topicName);
      }
    } else {
        //console.log(`Topic exists ${topicName}`);
    }

    let subscription = await pubSubTopic.subscription(subscriptionName);

    const [subscriptionExists] = await subscription.exists();

    if(!subscriptionExists) {
      try {
        [subscription] = await pubSubTopic.createSubscription(subscriptionName)
        //console.log(`Subscription created ${subscriptionName}`);
      } catch(e) {
        console.log("Error creating subscription: " + subscriptionName);
      }
    } else {
        //console.log(`Subscription exists ${subscriptionName}`);
    }

    // Create Message Handler
    subscription.on('message', async (message) => {
  
      // "Ack" (acknowledge receipt of) the message
      message.ack();
  
      // Decompose message to objects
  
      const messageObject = JSON.parse(message.data.toString());
  
      // Need to link this back to the listener
      listener(tenant,messageObject.event,messageObject.indexes);
    });

    //this.eventEmitter.on(`${tenant}_${EVENTS_LISTENER_CHANNEL}`, listener);
    // needs to close this subscription
    // 
    return {
      id,
      close: async (): Promise<void> => { 
        const [subscriptionToCloseExists] = await subscription.exists();
        if(subscriptionToCloseExists) {
          try {
            await subscription.removeListener('message', listener);
            await subscription.close(); 
            await subscription.delete(); 
          } catch(e) {
            console.log("Error closing and deleting subscription: " + subscription.name);
          }
        } else {
          //console.log("Subscription " + subscription.name + " already closed");
        }
      }
    };
    
  }

  private getTopicName(tenant: String): string {
    let topicName = `${tenant}_${EVENTS_LISTENER_CHANNEL}`;
    topicName = topicName.replace(/:/g, '_');
    return topicName;
  }
  
  private getSubscriptionName(tenant: String, id: String): string {
    let subscriptionName = "sub_" + tenant + "_" + id;
    subscriptionName = subscriptionName.replace(/:/g, '_');
    return subscriptionName;
  }

  async open(): Promise<void> {
    this.isOpen = true;
    //console.log("Opening PubSub");
  }

  async close(): Promise<void> {
    this.isOpen = false;
    //console.log("Closing PubSub");
    //this.eventEmitter.removeAllListeners();
    //await this.pubSubClient.subscription(this.getSubscriptionName()).removeListener('message', this.messageHandler);
    // close all subscriptions for the pubsub client
    // Lists all subscriptions in the current project
    let pubSubClient = new PubSub({projectId: this.projectId});
    const [subscriptions] = await pubSubClient.getSubscriptions();
    //subscriptions.forEach(subscription => { "Closing:" + console.log(subscription.name);  subscription.close(); } );
    for (const subscription of subscriptions) {
      try { 
        await subscription.close();
        //await subscription.delete();
      } catch(e) {
        //console.log("Error closing and deleting subscription");
      }
    }
  }

  async emit(tenant: string, event: MessageEvent, indexes: KeyValues): Promise<void> {

    if (!this.isOpen) {
      this.errorHandler(new DwnError(
        DwnErrorCode.EventEmitterStreamNotOpenError,
        'a message emitted when EventEmitterStream is closed'
      ));
      return;
    }

    // PubSub Topic name
    let topicName = this.getTopicName(tenant);

    const messageObject = {
      tenant: tenant,
      event: event,
      indexes: indexes
    }

    let message = JSON.stringify(messageObject);

    let pubSubClient = new PubSub({projectId: this.projectId});
    let pubSubTopic = await pubSubClient.topic(topicName);

    const [topicExists] = await pubSubTopic.exists();

    if(!topicExists) {

      try { 
        [pubSubTopic] =  await pubSubClient.createTopic(topicName);
        //console.log(`Topic created ${topicName}`);
      } catch(e) {
        console.log("Error creating topic: " + topicName);
      }

    } else {
        //console.log(`Topic exists ${topicName}`);
    }

    const messageId = pubSubTopic.publishMessage({data: Buffer.from(message)});

  }
}