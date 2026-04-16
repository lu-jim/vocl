import { handlerPath } from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'get',
        path: 'transcriptions',
      },
    },
    {
      http: {
        method: 'get',
        path: 'transcriptions/{id}',
      },
    },
  ],
};
