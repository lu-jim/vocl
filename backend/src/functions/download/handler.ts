import { formatJSONResponse } from '@libs/api-gateway';
import { middyfy } from '@libs/lambda';

const download = async () => {
  return formatJSONResponse({
    message: 'Download function stub',
  });
};

export const main = middyfy(download);
