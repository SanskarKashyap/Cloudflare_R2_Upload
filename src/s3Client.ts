import { S3Client } from '@aws-sdk/client-s3'

import { r2AccessKeyId, r2SecretAccessKey, r2S3Endpoint } from './config.js'

const S3 = new S3Client({
    region: 'auto',
    endpoint: r2S3Endpoint,
    credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
    },
})

export default S3
