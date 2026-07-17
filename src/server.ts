import { PutObjectCommand } from '@aws-sdk/client-s3'
import express from 'express'
import md5 from 'md5'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

import { r2BucketName, r2PublicBaseUrl } from './config.js'
import S3 from './s3Client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

const app = express()
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 200 * 1024 * 1024 }
})

app.use(express.static(publicDir))

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided.' })
    }

    const fileName = req.file.originalname
    const digest = md5(req.file.buffer)

    const cmd = new PutObjectCommand({
        Bucket: r2BucketName,
        Key: fileName,
        Body: req.file.buffer,
        ContentLength: req.file.size,
        ContentType: req.file.mimetype || 'application/octet-stream'
    })

    cmd.middlewareStack.add((next) => async (args: any) => {
        args.request.headers['if-none-match'] = `"${digest}"`
        return await next(args)
    }, {
        step: 'build',
        name: 'addETag'
    })

    try {
        await S3.send(cmd)
        res.json({
            success: true,
            key: fileName,
            url: r2PublicBaseUrl ? `${r2PublicBaseUrl}/${fileName}` : undefined
        })
    } catch (err: any) {
        if (err?.$metadata?.httpStatusCode === 412) {
            return res.status(409).json({
                error: 'This file already exists in the bucket (identical content).',
                key: fileName,
                url: r2PublicBaseUrl ? `${r2PublicBaseUrl}/${fileName}` : undefined
            })
        }

        console.error('Upload error', err)
        res.status(500).json({ error: err?.message || 'Upload failed.' })
    }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Upload server running at http://localhost:${PORT}`)
})
