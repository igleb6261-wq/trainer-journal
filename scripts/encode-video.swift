// Compresses an iPhone clip for the app: HEVC, same resolution, no audio.
// Build: swiftc -O scripts/encode-video.swift -o /tmp/enc   Run: /tmp/enc in.MOV out.mp4 4000000 30
// usage: enc <in> <out.mp4> <bitrate_bps> <fps>
import AVFoundation
let a = CommandLine.arguments
let src = URL(fileURLWithPath: a[1]), dst = URL(fileURLWithPath: a[2])
let bitrate = Int(a[3])!, fps = Double(a[4])!
try? FileManager.default.removeItem(at: dst)
let asset = AVURLAsset(url: src)
let track = asset.tracks(withMediaType: .video)[0]
let reader = try! AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
out.alwaysCopiesSampleData = false
reader.add(out)
let w = Int(track.naturalSize.width), h = Int(track.naturalSize.height)
let writer = try! AVAssetWriter(outputURL: dst, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.hevc, AVVideoWidthKey: w, AVVideoHeightKey: h,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoExpectedSourceFrameRateKey: fps,
    AVVideoMaxKeyFrameIntervalKey: Int(fps * 2)]])
input.transform = track.preferredTransform
input.expectsMediaDataInRealTime = false
writer.add(input); writer.shouldOptimizeForNetworkUse = true
reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)
let step = 1.0 / fps; var next = -1.0
let sem = DispatchSemaphore(value: 0)
input.requestMediaDataWhenReady(on: DispatchQueue(label: "q")) {
  while input.isReadyForMoreMediaData {
    guard let sb = out.copyNextSampleBuffer() else { input.markAsFinished(); writer.finishWriting { sem.signal() }; return }
    let t = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sb))
    if t + 0.001 < next { continue }
    next = (next < 0 ? t : next) + step
    input.append(sb)
  }
}
sem.wait()
if writer.status != .completed { print("ERROR", writer.error as Any); exit(1) }
