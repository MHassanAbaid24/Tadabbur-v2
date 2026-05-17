import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"

type PngDimensions = {
  width: number
  height: number
}

const projectRoot = path.resolve(__dirname, '../../../')
const publicDir = path.join(projectRoot, 'public')
const manifestPath = path.join(publicDir, 'manifest.json')

const readPngDimensions = (filePath: string): PngDimensions => {
  const buffer = readFileSync(filePath)
  const pngSignature = '89504e470d0a1a0a'
  expect(buffer.subarray(0, 8).toString('hex')).toBe(pngSignature)
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  }
}

describe('PWA screenshot assets', () => {
  it('declares required screenshot entries in manifest', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as {
      screenshots?: Array<{ src: string; sizes: string; type: string; form_factor: string }>
    }

    expect(manifest.screenshots).toEqual(
      expect.arrayContaining([
        {
          src: '/screenshot-540.png',
          sizes: '540x720',
          type: 'image/png',
          form_factor: 'narrow'
        },
        {
          src: '/screenshot-1280.png',
          sizes: '1280x720',
          type: 'image/png',
          form_factor: 'wide'
        }
      ])
    )
  })

  it('ships screenshot files in public with exact dimensions', () => {
    const narrowPath = path.join(publicDir, 'screenshot-540.png')
    const widePath = path.join(publicDir, 'screenshot-1280.png')

    expect(existsSync(narrowPath)).toBe(true)
    expect(existsSync(widePath)).toBe(true)

    expect(readPngDimensions(narrowPath)).toEqual({ width: 540, height: 720 })
    expect(readPngDimensions(widePath)).toEqual({ width: 1280, height: 720 })
  })
})
