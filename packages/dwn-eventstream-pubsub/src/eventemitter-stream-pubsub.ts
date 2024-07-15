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
  //private eventEmitter: EventEmitter;
  isOpen: boolean = false;
  //pubSubClient;
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

    //this.eventEmitter.on('error', this.errorHandler);

    // Instantiates a client
    //this.projectId = 'gcda-tbd-dwn';
    this.projectId = process.env.DWN_PROJECT_ID as string;
    //console.log("Instantiates PubSub client: " + projectId);
    //this.pubSubClient = new PubSub({projectId});
    //console.log("PubSub client created");
  }

  /**
   * we subscribe to the `EventEmitter` error handler with a provided handler or set one which logs the errors.
   */
  private errorHandler: (error:any) => void = (error) => { console.error('event emitter error', error); };

  
  async subscribe(tenant: string, id: string, listener: EventListener): Promise<EventSubscription> {
    
    console.log("subscribe");

    // Get topic name
    let topicName = this.getTopicName(tenant);

    // Get subscription name
    let subscriptionName = this.getSubscriptionName(tenant, id);

    // Create a subscription
    //console.log(`Creating subscription.`);
    //const [pubSubTopic] = await this.pubSubClient.createTopic(topicName);
    //const [subscription] = await pubSubTopic.createSubscription(subscriptionName);
    //console.log(`Subscription ${subscriptionName} created.`);

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
      console.log([topicExists]);
    } catch(e) {
      console.log("Error topic exists");
    }

    if(!topicExists) {
      try{
        [pubSubTopic] =  await pubSubClient.createTopic(topicName);
        console.log(`Topic created ${topicName}`);
      } catch(e) {
        console.log("Error creating topic");
      }
    } else {
        console.log(`Topic exists ${topicName}`);
    }

    let subscription = await pubSubTopic.subscription(subscriptionName);

    const [subscriptionExists] = await subscription.exists();

    if(!subscriptionExists) {
      try {
        [subscription] = await pubSubTopic.createSubscription(subscriptionName)
        console.log(`Subscription created ${subscriptionName}`);
      } catch(e) {
        console.log("Error creating subscription");
      }
    } else {
        console.log(`Subscription exists ${subscriptionName}`);
    }

    // Create Message Handler
    //let subscriptionMessageHandler = new SubscriptionMessageHandler(tenant, subscriptionName, listener, this.pubSubClient);
    //subscription.on('message', async subscriptionMessageHandler.messageHandler);
    subscription.on('message', async (message) => {
      console.log(`Received message on: ${message.id}:`);
      console.log(`\tData: ${message.data.toString()}`);
      console.log(`\tAttributes: ${message.attributes}`);
  
      // "Ack" (acknowledge receipt of) the message
      message.ack();
  
      // Decompose message to objects
  
      const messageObject = JSON.parse(message.data.toString());
      /*{
        tenant: tenant,
        event: event,
        indexes: indexes
      } */
      console.log("tenant: " + JSON.stringify(messageObject.tenant));
      console.log("event: " + JSON.stringify(messageObject.event));
      console.log("indexes: " + JSON.stringify(messageObject.indexes));
  
      // Need to link this back to the listener
      console.log("listener (on): " + listener);
      listener(tenant,messageObject.event,messageObject.indexes);
      //const response = await message.ackWithResponse();
    });

    //subscription.on('debug', msg => { console.log("debug: " + msg.message); });
    /*
    subscription.on('close', () => {
      console.log("removing listener (on close): " + subscription.name); 
      // gets the listeners for the message
      //for (const listener of subscription.listeners('message')) {
      //  console.log("listener (close): " + JSON.stringify(listener));
      //}
      subscription.removeListener('message', listener);
      subscription.delete();
    }); */

    //this.eventEmitter.on(`${tenant}_${EVENTS_LISTENER_CHANNEL}`, listener);
    // needs to close this subscription
    // 
    return {
      id,
      close: async (): Promise<void> => { 
        console.log("closing subscription (return): " + subscription.name); 
        const [subscriptionToCloseExists] = await subscription.exists();
        if(subscriptionToCloseExists) {
          try {
            await subscription.removeListener('message', listener);
            await subscription.close(); 
            await subscription.delete(); 
          } catch(e) {
            console.log("Error closing and deleting subscription");
          }
        } else {
          console.log("Subscription " + subscription.name + " already closed");
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
    console.log("Opening PubSub");
  }

  async close(): Promise<void> {
    this.isOpen = false;
    console.log("Closing PubSub");
    //this.eventEmitter.removeAllListeners();
    //await this.pubSubClient.subscription(this.getSubscriptionName()).removeListener('message', this.messageHandler);
    // close all subscriptions for the pubsub client
    // Lists all subscriptions in the current project
    let pubSubClient = new PubSub({projectId: this.projectId});
    const [subscriptions] = await pubSubClient.getSubscriptions();
    console.log('Number of subscriptions:' + subscriptions.length);
    //subscriptions.forEach(subscription => { "Closing:" + console.log(subscription.name);  subscription.close(); } );
    for (const subscription of subscriptions) {
      try { 
        console.log("Closing " + subscription.name);
        await subscription.close();
        //await subscription.delete();
      } catch(e) {
        console.log("Error closing and deleting subscription");
      }
    }
  }

  async emit(tenant: string, event: MessageEvent, indexes: KeyValues): Promise<void> {
    
    console.log("emit");

    if (!this.isOpen) {
      this.errorHandler(new DwnError(
        DwnErrorCode.EventEmitterStreamNotOpenError,
        'a message emitted when EventEmitterStream is closed'
      ));
      return;
    }
    //this.eventEmitter.emit(`${tenant}_${EVENTS_LISTENER_CHANNEL}`, tenant, event, indexes);

    //console.log("tenant:" + tenant);
    //console.log("event:" +  JSON.stringify(event));
    //console.log("indexes:" +  JSON.stringify(indexes));
    // PubSub Topic name
    let topicName = this.getTopicName(tenant);

    const messageObject = {
      tenant: tenant,
      event: event,
      indexes: indexes
    }

    
    let message = JSON.stringify(messageObject);
    console.log(message);

    let pubSubClient = new PubSub({projectId: this.projectId});
    let pubSubTopic = await pubSubClient.topic(topicName);

    const [topicExists] = await pubSubTopic.exists();

    if(!topicExists) {

      try { 
        [pubSubTopic] =  await pubSubClient.createTopic(topicName);
        console.log(`Topic created ${topicName}`);
      } catch(e) {
        console.log("Error creating topic");
      }

    } else {
        console.log(`Topic exists ${topicName}`);
    }

    const messageId = pubSubTopic.publishMessage({data: Buffer.from(message)});
    console.log("message published: " + messageId);

  }
}