import mixpanel from 'mixpanel';

const mixpanelClient = mixpanel.init(process.env.MIXPANEL_TOKEN);

export const trackEvent = (eventName: string, properties: Record<string, any>) => {
  mixpanelClient.track(eventName, properties);
};

export const trackError = (error: Error, context: string) => {
  mixpanelClient.track('Error', {
    message: error.message,
    stack: error.stack,
    context,
  });
};
