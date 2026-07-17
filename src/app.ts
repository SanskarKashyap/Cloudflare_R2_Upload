import {
    PutObjectCommand,
    PutObjectCommandInput
} from '@aws-sdk/client-s3'
import fs  from 'fs'
import md5 from 'md5'

import { r2BucketName, r2PublicBaseUrl } from './config.js'
import S3 from './s3Client.js'

const getFileList = (dirName: string): string[] => {
    let files: string[] = [];
    const items = fs.readdirSync(dirName, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            files = [...files, ...getFileList(`${dirName}/${item.name}`)];
        } else {
            files.push(`${dirName}/${item.name}`);
        }
    }

    return files;
};

const files: string[] = getFileList('uploads');

try {
    for (const file of files) {
        const fileStream = fs.readFileSync(file);
        const fileName = file.replace(/uploads\//g, '');

        if (fileName.includes('.gitkeep'))
            continue;

        console.log(fileName)

        const uploadParams: PutObjectCommandInput = {
            Bucket: r2BucketName,
            Key: fileName,
            Body: fileStream,
            ContentLength: fs.statSync(file).size,
            ContentType: 'application/octet-stream'
        };

        const cmd = new PutObjectCommand(uploadParams);

        const digest = md5(fileStream);

        cmd.middlewareStack.add((next) => async (args: any) => {
            args.request.headers['if-none-match'] = `"${digest}"`;
            return await next(args);
        }, {
            step: 'build',
            name: 'addETag'
        })

        const data = await S3.send(cmd);
        console.log(`Success - Status Code: ${data.$metadata.httpStatusCode}`);

        if (r2PublicBaseUrl) {
            console.log(`Public URL: ${r2PublicBaseUrl}/${fileName}`);
        }
    }
} catch (err: unknown) {
    if (err && typeof err === 'object' && '$metadata' in err) {
        const awsErr = err as { $metadata: { httpStatusCode?: number }, message: string }
        console.error(`Error - Status Code: ${awsErr.$metadata.httpStatusCode} - ${awsErr.message}`);
    } else {
        console.error('Error', err);
    }
}
