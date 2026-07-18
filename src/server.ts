import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3'
import express from 'express'
import md5 from 'md5'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

import { r2BucketName, r2PublicBaseUrl } from './config.js'
import S3 from './s3Client.js'
import supabase from './supabaseClient.js'

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

app.get('/files', async (req, res) => {
    try {
        const files: { key: string, size: number, lastModified?: Date, url?: string }[] = []
        let continuationToken: string | undefined

        do {
            const data = await S3.send(new ListObjectsV2Command({
                Bucket: r2BucketName,
                ContinuationToken: continuationToken
            }))

            for (const obj of data.Contents || []) {
                if (!obj.Key) continue
                files.push({
                    key: obj.Key,
                    size: obj.Size || 0,
                    lastModified: obj.LastModified,
                    url: r2PublicBaseUrl ? `${r2PublicBaseUrl}/${obj.Key}` : undefined
                })
            }

            continuationToken = data.IsTruncated ? data.NextContinuationToken : undefined
        } while (continuationToken)

        res.json({ files })
    } catch (err: any) {
        console.error('List error', err)
        res.status(500).json({ error: err?.message || 'Failed to list files.' })
    }
})

app.get('/download', async (req, res) => {
    const key = req.query.key

    if (typeof key !== 'string' || !key) {
        return res.status(400).json({ error: 'Missing key parameter.' })
    }

    try {
        const data = await S3.send(new GetObjectCommand({ Bucket: r2BucketName, Key: key }))

        res.setHeader('Content-Type', data.ContentType || 'application/octet-stream')
        if (data.ContentLength) res.setHeader('Content-Length', String(data.ContentLength))
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(key.split('/').pop() || key)}"`)

        const body = data.Body as NodeJS.ReadableStream | undefined
        if (!body) {
            return res.status(404).json({ error: 'File not found.' })
        }

        body.pipe(res)
    } catch (err: any) {
        console.error('Download error', err)
        res.status(err?.$metadata?.httpStatusCode || 500).json({ error: err?.message || 'Download failed.' })
    }
})

// Looks up a previously extracted PDF's text, keyed by its R2 object key.
// Returns 404 if absent, or if the stored `lastModified` no longer matches
// (the R2 object was overwritten since the text was extracted).
app.get('/pdf-text', async (req, res) => {
    const key = req.query.key
    const lastModified = req.query.lastModified

    if (typeof key !== 'string' || !key) {
        return res.status(400).json({ error: 'Missing key parameter.' })
    }

    if (!supabase) {
        return res.status(503).json({ error: 'Supabase is not configured.' })
    }

    try {
        const { data, error } = await supabase
            .from('pdf_extractions')
            .select('*')
            .eq('id', key)
            .maybeSingle()

        if (error) throw error

        if (!data || (typeof lastModified === 'string' && lastModified && data.last_modified !== lastModified)) {
            return res.status(404).json({ error: 'Not found.' })
        }

        res.json({
            id: data.id,
            key: data.key,
            size: data.size,
            lastModified: data.last_modified,
            numPages: data.num_pages,
            text: data.text,
            usedOcr: data.used_ocr,
            extractedAt: data.extracted_at
        })
    } catch (err: any) {
        console.error('Supabase lookup error', err)
        res.status(500).json({ error: err?.message || 'Lookup failed.' })
    }
})

// Stores (or replaces) the extracted text for a PDF, keyed by its R2 object key.
app.post('/pdf-text', express.json({ limit: '25mb' }), async (req, res) => {
    const { id, key, size, lastModified, numPages, text, usedOcr, extractedAt } = req.body || {}

    if (typeof id !== 'string' || !id || typeof key !== 'string' || !key || typeof text !== 'string') {
        return res.status(400).json({ error: 'Missing required fields.' })
    }

    if (!supabase) {
        return res.status(503).json({ error: 'Supabase is not configured.' })
    }

    try {
        const { error } = await supabase
            .from('pdf_extractions')
            .upsert({
                id,
                key,
                size,
                last_modified: lastModified,
                num_pages: numPages,
                text,
                used_ocr: !!usedOcr,
                extracted_at: extractedAt
            }, { onConflict: 'id' })

        if (error) throw error

        res.json({ success: true })
    } catch (err: any) {
        console.error('Supabase upsert error', err)
        res.status(500).json({ error: err?.message || 'Save failed.' })
    }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Upload server running at http://localhost:${PORT}`)
})
