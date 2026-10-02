export interface FrameSource {
  label: string
  videoUrl: string | null
  status: 'configured' | 'no-signal'
  isDemo: boolean
}

export class DemoVideoFrameSource implements FrameSource {
  label = 'Demo video'
  videoUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL || null
  status = this.videoUrl ? 'configured' as const : 'no-signal' as const
  isDemo = true
}

export class CameraFrameSource implements FrameSource {
  label = 'Camera feed'
  videoUrl = null
  status = 'no-signal' as const
  isDemo = false
}

export function createFrameSource(isDemo: boolean): FrameSource {
  return isDemo ? new DemoVideoFrameSource() : new CameraFrameSource()
}