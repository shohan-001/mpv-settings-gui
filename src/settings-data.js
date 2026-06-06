/**
 * MPV Settings Data Definitions
 * 
 * Exposes setting structures, tooltips, presets, and default keybindings.
 */

const SETTINGS_CATEGORIES = [
  {
    id: 'video',
    title: '🎬 Video',
    description: 'Configure video output, hardware decoding, shaders, and scaling algorithms.',
    settings: [
      {
        name: 'vo',
        label: 'Video Output Driver',
        type: 'select',
        options: ['gpu', 'gpu-next', 'x11', 'wayland', 'drm', 'null'],
        default: 'gpu',
        description: 'Specify the video output backend. "gpu" is recommended for most users, while "gpu-next" is the newer experimental renderer.'
      },
      {
        name: 'gpu-api',
        label: 'GPU API',
        type: 'select',
        options: ['auto', 'opengl', 'vulkan'],
        default: 'auto',
        description: 'API used for GPU video rendering. Vulkan is recommended on modern hardware.'
      },
      {
        name: 'gpu-context',
        label: 'GPU Context',
        type: 'select',
        options: ['auto', 'wayland', 'x11egl', 'drm'],
        default: 'auto',
        description: 'Context creation backend for GPU video rendering.'
      },
      {
        name: 'hwdec',
        label: 'Hardware Decoding',
        type: 'select',
        options: ['no', 'auto', 'auto-safe', 'auto-copy', 'vaapi', 'vaapi-copy', 'nvdec', 'nvdec-copy'],
        default: 'no',
        description: 'Specify the hardware video decoding API to use. "auto-safe" attempts to use safe hardware acceleration.'
      },
      {
        name: 'profile',
        label: 'Quality Profile',
        type: 'select',
        options: ['default', 'high-quality', 'fast'],
        default: 'default',
        description: 'Built-in profile presets for video rendering quality.'
      },
      {
        name: 'video-sync',
        label: 'Video Sync Mode',
        type: 'select',
        options: ['audio', 'display-resample', 'display-resample-vdrop', 'display-resample-desync'],
        default: 'audio',
        description: 'Method used to synchronize audio and video. "display-resample" adjusts audio speed to match video frames.'
      },
      {
        name: 'interpolation',
        label: 'Frame Interpolation',
        type: 'toggle',
        default: 'no',
        description: 'Reduce stuttering/judder by interpolating frames (requires video-sync = display-resample).'
      },
      {
        name: 'deband',
        label: 'Debanding',
        type: 'toggle',
        default: 'no',
        description: 'Reduce color banding artifacts. Can clean up gradients but increases GPU usage.'
      },
      {
        name: 'deinterlace',
        label: 'Deinterlace',
        type: 'select',
        options: ['no', 'yes', 'auto'],
        default: 'no',
        description: 'Enable deinterlacing for interlaced video sources (like old TV broadcasts).'
      },
      {
        name: 'scale',
        label: 'Upscaling Filter',
        type: 'select',
        options: ['bilinear', 'lanczos', 'ewa_lanczos', 'ewa_lanczossharp', 'spline36'],
        default: 'lanczos',
        description: 'Filtering algorithm for scaling up video.'
      },
      {
        name: 'dscale',
        label: 'Downscaling Filter',
        type: 'select',
        options: ['bilinear', 'lanczos', 'ewa_lanczos', 'ewa_lanczossharp', 'spline36'],
        default: 'lanczos',
        description: 'Filtering algorithm for scaling down video.'
      },
      {
        name: 'cscale',
        label: 'Chroma Scaling Filter',
        type: 'select',
        options: ['bilinear', 'lanczos', 'ewa_lanczos', 'ewa_lanczossharp', 'spline36'],
        default: 'lanczos',
        description: 'Filtering algorithm for scaling chroma (color) channels.'
      },
      {
        name: 'tscale',
        label: 'Temporal Interpolation Filter',
        type: 'select',
        options: ['oversample', 'linear', 'catmull_rom', 'mitchell', 'bicubic', 'sphinx'],
        default: 'oversample',
        description: 'Filtering algorithm used for frame interpolation.'
      },
      {
        name: 'correct-downscaling',
        label: 'Correct Downscaling',
        type: 'toggle',
        default: 'yes',
        description: 'Apply downscaling filter in linear light instead of gamma light.'
      },
      {
        name: 'sigmoid-upscaling',
        label: 'Sigmoid Upscaling',
        type: 'toggle',
        default: 'yes',
        description: 'Apply sigmoid curve to upscaling to prevent ringing artifacts.'
      },
      {
        name: 'dither-depth',
        label: 'Dither Depth',
        type: 'select',
        options: ['auto', 'no', '8', '10'],
        default: 'auto',
        description: 'Dither target depth. Helps prevent color banding on 8-bit or 10-bit screens.'
      },
      {
        name: 'gamma-auto',
        label: 'Auto Gamma',
        type: 'toggle',
        default: 'no',
        description: 'Automatically adjust gamma correction based on screen luminance.'
      },
      {
        name: 'target-trc',
        label: 'Target Color Transfer',
        type: 'select',
        options: ['auto', 'bt.1886', 'srgb', 'linear', 'gamma1.8', 'gamma2.0', 'gamma2.2', 'pq', 'hlg'],
        default: 'auto',
        description: 'Specify the transfer characteristics of the display.'
      },
      {
        name: 'hdr-compute-peak',
        label: 'HDR Dynamic Peak',
        type: 'toggle',
        default: 'yes',
        description: 'Compute HDR peak luminance dynamically per frame (requires vo=gpu or gpu-next).'
      },
      {
        name: 'tone-mapping',
        label: 'Tone Mapping Algorithm',
        type: 'select',
        options: ['auto', 'clip', 'mobius', 'reinhard', 'hable', 'bt.2390', 'gamma', 'linear'],
        default: 'auto',
        description: 'Algorithm used for converting HDR content to SDR displays.'
      }
    ]
  },
  {
    id: 'audio',
    title: '🔊 Audio',
    description: 'Control audio outputs, channels, pitch correction, languages, and exclusive modes.',
    settings: [
      {
        name: 'ao',
        label: 'Audio Output Driver',
        type: 'select',
        options: ['pulse', 'pipewire', 'alsa', 'jack', 'null'],
        default: 'pulse',
        description: 'Select the audio output driver. On modern Linux systems, "pulse" or "pipewire" is recommended.'
      },
      {
        name: 'volume',
        label: 'Default Volume',
        type: 'slider',
        min: 0,
        max: 150,
        step: 1,
        default: 100,
        description: 'Set default volume percentage level on startup.'
      },
      {
        name: 'volume-max',
        label: 'Maximum Volume Limit',
        type: 'slider',
        min: 100,
        max: 200,
        step: 5,
        default: 130,
        description: 'Maximum amplification level allowed (MPV default is 130%).'
      },
      {
        name: 'audio-channels',
        label: 'Audio Channels Layout',
        type: 'select',
        options: ['auto', 'auto-safe', 'mono', 'stereo', '5.1', '7.1'],
        default: 'auto',
        description: 'Request specific audio channel layout on startup.'
      },
      {
        name: 'audio-normalize-downmix',
        label: 'Normalize on Downmix',
        type: 'toggle',
        default: 'no',
        description: 'Normalize audio volume when downmixing multi-channel audio to stereo.'
      },
      {
        name: 'audio-pitch-correction',
        label: 'Pitch Correction',
        type: 'toggle',
        default: 'yes',
        description: 'Maintain original audio pitch when playing at slower/faster speeds.'
      },
      {
        name: 'audio-file-auto',
        label: 'Auto Load External Audio',
        type: 'select',
        options: ['no', 'exact', 'fuzzy', 'all'],
        default: 'exact',
        description: 'Automatically load external audio files matching the video filename.'
      },
      {
        name: 'alang',
        label: 'Preferred Audio Languages',
        type: 'text',
        default: 'en,eng,ja,jpn',
        description: 'Priority list of audio languages (comma-separated codes, e.g., "en,eng,ja,jpn").'
      },
      {
        name: 'audio-exclusive',
        label: 'Exclusive Mode (Bitstream)',
        type: 'toggle',
        default: 'no',
        description: 'Enable audio output exclusive mode (bypasses system audio mixer, ALSA only).'
      },
      {
        name: 'audio-spdif',
        label: 'S/PDIF Passthrough Codecs',
        type: 'text',
        default: '',
        description: 'List of audio codecs to pass through over S/PDIF (comma-separated, e.g. "ac3,dts").'
      },
      {
        name: 'af',
        label: 'Audio Filters',
        type: 'text',
        default: '',
        description: 'Apply audio filters (e.g. "lavfi=[loudnorm]" for volume normalization).'
      }
    ]
  },
  {
    id: 'subtitles',
    title: '📝 Subtitles',
    description: 'Customize subtitle styling, position, font selection, and search rules.',
    settings: [
      {
        name: 'sub-auto',
        label: 'Auto Load Subtitles',
        type: 'select',
        options: ['no', 'exact', 'fuzzy', 'all'],
        default: 'exact',
        description: 'Automatically search and load external subtitles matching the video file.'
      },
      {
        name: 'sub-font',
        label: 'Subtitle Font Family',
        type: 'text',
        default: 'sans-serif',
        description: 'Font family name used for text subtitles (e.g., "sans-serif", "Inter", "Arial").'
      },
      {
        name: 'sub-font-size',
        label: 'Subtitle Font Size',
        type: 'slider',
        min: 10,
        max: 100,
        step: 1,
        default: 55,
        description: 'Font size in points (default: 55).'
      },
      {
        name: 'sub-color',
        label: 'Subtitle Text Color',
        type: 'color',
        default: '#FFFFFFFF',
        description: 'Color of subtitle text (supports alpha transparency).'
      },
      {
        name: 'sub-border-color',
        label: 'Subtitle Border Color',
        type: 'color',
        default: '#000000FF',
        description: 'Color of subtitle text border/outline.'
      },
      {
        name: 'sub-border-size',
        label: 'Subtitle Border Size',
        type: 'slider',
        min: 0,
        max: 10,
        step: 0.5,
        default: 3,
        description: 'Thickness of subtitle text border.'
      },
      {
        name: 'sub-back-color',
        label: 'Subtitle Background Color',
        type: 'color',
        default: '#00000000',
        description: 'Color of background bounding box behind subtitle text.'
      },
      {
        name: 'sub-shadow-offset',
        label: 'Subtitle Shadow Offset',
        type: 'slider',
        min: 0,
        max: 10,
        step: 0.5,
        default: 0,
        description: 'Offset of subtitle text shadow.'
      },
      {
        name: 'sub-shadow-color',
        label: 'Subtitle Shadow Color',
        type: 'color',
        default: '#000000FF',
        description: 'Color of subtitle text shadow.'
      },
      {
        name: 'sub-bold',
        label: 'Force Bold Text',
        type: 'toggle',
        default: 'no',
        description: 'Force subtitle text to render in bold format.'
      },
      {
        name: 'sub-italic',
        label: 'Force Italic Text',
        type: 'toggle',
        default: 'no',
        description: 'Force subtitle text to render in italic format.'
      },
      {
        name: 'sub-pos',
        label: 'Vertical Subtitle Position',
        type: 'slider',
        min: 0,
        max: 150,
        step: 1,
        default: 100,
        description: 'Position on screen (100 = default bottom; lower values push it higher up).'
      },
      {
        name: 'sub-margin-y',
        label: 'Vertical Margin',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 22,
        description: 'Bottom screen margin offset in pixels (default: 22).'
      },
      {
        name: 'slang',
        label: 'Preferred Subtitle Languages',
        type: 'text',
        default: 'en,eng',
        description: 'Priority list of subtitle languages (comma-separated, e.g. "en,eng,ja").'
      },
      {
        name: 'sub-ass-override',
        label: 'ASS Styles Override',
        type: 'select',
        options: ['no', 'yes', 'force', 'scale', 'strip'],
        default: 'no',
        description: 'How to override custom ASS/SSA styling embedded in anime or styled subtitles.'
      },
      {
        name: 'sub-fix-timing',
        label: 'Fix Subtitle Timing gaps',
        type: 'toggle',
        default: 'no',
        description: 'Fix minor subtitle duration gaps to prevent blinking.'
      },
      {
        name: 'sub-ass-force-margins',
        label: 'Force Margins for ASS',
        type: 'toggle',
        default: 'no',
        description: 'Apply vertical margin settings to ASS subtitles.'
      },
      {
        name: 'blend-subtitles',
        label: 'Blend Subtitles to Video',
        type: 'select',
        options: ['no', 'yes', 'video'],
        default: 'no',
        description: 'Blend subtitles directly into video frame at source resolution (helps performance but limits scaling).'
      }
    ]
  },
  {
    id: 'osd',
    title: '📺 OSD',
    description: 'Style the On Screen Display overlay, playback status bars, and font sizing.',
    settings: [
      {
        name: 'osd-level',
        label: 'OSD Level',
        type: 'select',
        options: ['0', '1', '2', '3'],
        default: '1',
        description: 'Sets OSD complexity: 0 = disabled, 1 = seek bar, 2 = seek bar + time, 3 = + total duration.'
      },
      {
        name: 'osd-font',
        label: 'OSD Font Family',
        type: 'text',
        default: 'sans-serif',
        description: 'Font family name for On-Screen Display texts (e.g., "sans-serif", "Liberation Sans").'
      },
      {
        name: 'osd-font-size',
        label: 'OSD Font Size',
        type: 'slider',
        min: 10,
        max: 100,
        step: 1,
        default: 55,
        description: 'Font size of OSD message text (default: 55).'
      },
      {
        name: 'osd-color',
        label: 'OSD Text Color',
        type: 'color',
        default: '#FFFFFFFF',
        description: 'Color of OSD text.'
      },
      {
        name: 'osd-border-color',
        label: 'OSD Border Color',
        type: 'color',
        default: '#000000FF',
        description: 'Border color around OSD text.'
      },
      {
        name: 'osd-border-size',
        label: 'OSD Border Size',
        type: 'slider',
        min: 0,
        max: 10,
        step: 0.5,
        default: 3,
        description: 'Thickness of OSD text border outline.'
      },
      {
        name: 'osd-back-color',
        label: 'OSD Background Color',
        type: 'color',
        default: '#00000000',
        description: 'Background box color for OSD messages (default transparent).'
      },
      {
        name: 'osd-shadow-offset',
        label: 'OSD Shadow Offset',
        type: 'slider',
        min: 0,
        max: 10,
        step: 0.5,
        default: 0,
        description: 'Drop shadow distance for OSD texts.'
      },
      {
        name: 'osd-duration',
        label: 'OSD Message Duration',
        type: 'slider',
        min: 100,
        max: 5000,
        step: 100,
        default: 1000,
        description: 'Time in milliseconds to display temporary OSD messages (default: 1000ms).'
      },
      {
        name: 'osd-bar',
        label: 'Show OSD Seekbar',
        type: 'toggle',
        default: 'yes',
        description: 'Enable or disable the visual seek bar during seeking actions.'
      },
      {
        name: 'osd-bar-w',
        label: 'Seekbar Width',
        type: 'slider',
        min: 1,
        max: 100,
        step: 1,
        default: 75,
        description: 'Seekbar width as percentage of screen width (default: 75).'
      },
      {
        name: 'osd-bar-h',
        label: 'Seekbar Height',
        type: 'slider',
        min: 0.1,
        max: 10,
        step: 0.1,
        default: 3.1,
        description: 'Seekbar height as percentage of screen height (default: 3.1).'
      },
      {
        name: 'osd-playing-msg',
        label: 'Startup Playback Message',
        type: 'text',
        default: '',
        description: 'OSD text template to display when loading a file (e.g. "Playing: ${filename}").'
      },
      {
        name: 'osd-on-seek',
        label: 'OSD Status On Seek',
        type: 'select',
        options: ['no', 'bar', 'msg', 'msg-bar'],
        default: 'bar',
        description: 'Choose what to display on seek action: bar, text message, or both.'
      }
    ]
  },
  {
    id: 'screenshots',
    title: '📷 Screenshots',
    description: 'Adjust formats (PNG/JPG/WebP/JXL), save directories, and naming templates.',
    settings: [
      {
        name: 'screenshot-format',
        label: 'Screenshot Format',
        type: 'select',
        options: ['png', 'jpg', 'jpeg', 'webp', 'jxl'],
        default: 'png',
        description: 'Image format type for captured screenshots.'
      },
      {
        name: 'screenshot-png-compression',
        label: 'PNG Compression level',
        type: 'slider',
        min: 0,
        max: 9,
        step: 1,
        default: 7,
        description: 'Compression level for PNG (0 = none/fastest, 9 = maximum/slowest).'
      },
      {
        name: 'screenshot-jpeg-quality',
        label: 'JPEG Quality level',
        type: 'slider',
        min: 0,
        max: 100,
        step: 5,
        default: 90,
        description: 'Quality level of JPG screenshots (default: 90).'
      },
      {
        name: 'screenshot-webp-quality',
        label: 'WebP Quality level',
        type: 'slider',
        min: 0,
        max: 100,
        step: 5,
        default: 90,
        description: 'Quality level of WebP screenshots (default: 90).'
      },
      {
        name: 'screenshot-webp-lossless',
        label: 'WebP Lossless',
        type: 'toggle',
        default: 'no',
        description: 'Enable lossless quality compression for WebP screenshots.'
      },
      {
        name: 'screenshot-directory',
        label: 'Save Directory Path',
        type: 'directory',
        default: '',
        description: 'Directory where screenshots will be saved. Leaving it blank saves in the current file directory.'
      },
      {
        name: 'screenshot-template',
        label: 'Filename Template',
        type: 'text',
        default: 'mpv-shot%n',
        description: 'Name template for screenshot files. %n is sequence, %F is filename, %p is position.'
      },
      {
        name: 'screenshot-tag-colorspace',
        label: 'Tag Colorspace info',
        type: 'toggle',
        default: 'yes',
        description: 'Tag screenshot image file with appropriate color profile information.'
      },
      {
        name: 'screenshot-high-bit-depth',
        label: 'High Bit Depth',
        type: 'toggle',
        default: 'yes',
        description: 'Write screenshots in high bit depth if supported by the format (usually 16-bit PNG).'
      }
    ]
  },
  {
    id: 'window',
    title: '🪟 Window',
    description: 'Set initial geometry, borders, on-top state, autofocus, and open/idle behaviors.',
    settings: [
      {
        name: 'fullscreen',
        label: 'Launch in Fullscreen',
        type: 'toggle',
        default: 'no',
        description: 'Automatically start playback in fullscreen mode.'
      },
      {
        name: 'border',
        label: 'Show Window Border',
        type: 'toggle',
        default: 'yes',
        description: 'Render native OS window decorations (borders, titlebar).'
      },
      {
        name: 'ontop',
        label: 'Always On Top',
        type: 'toggle',
        default: 'no',
        description: 'Keep the player window floating on top of all other applications.'
      },
      {
        name: 'keepaspect-window',
        label: 'Keep Window Aspect Ratio',
        type: 'toggle',
        default: 'yes',
        description: 'Lock player window aspect ratio to video content aspect ratio when resizing.'
      },
      {
        name: 'keepaspect',
        label: 'Keep Video Aspect Ratio',
        type: 'toggle',
        default: 'yes',
        description: 'Lock aspect ratio of video inside the window (prevents stretching).'
      },
      {
        name: 'geometry',
        label: 'Initial Size / Position',
        type: 'text',
        default: '',
        description: 'Set initial window size and position (e.g., "50%x50%" or "1280x720" or "50%+10+10").'
      },
      {
        name: 'autofit',
        label: 'Autofit size limits',
        type: 'text',
        default: '',
        description: 'Scale window to specific size percentage limits (e.g. "90%x90%").'
      },
      {
        name: 'autofit-larger',
        label: 'Max autofit limit',
        type: 'text',
        default: '',
        description: 'Maximum width/height size limit (e.g., "100%x100%").'
      },
      {
        name: 'autofit-smaller',
        label: 'Min autofit limit',
        type: 'text',
        default: '',
        description: 'Minimum window width/height size limit (e.g., "640x480").'
      },
      {
        name: 'force-window',
        label: 'Force Window Display',
        type: 'select',
        options: ['no', 'yes', 'immediate'],
        default: 'no',
        description: 'Create player window even if playing audio-only files.'
      },
      {
        name: 'title',
        label: 'Window Title Template',
        type: 'text',
        default: '${filename} - mpv',
        description: 'Specify the window title string format. Supports property expansion.'
      },
      {
        name: 'cursor-autohide',
        label: 'Autohide Cursor delay',
        type: 'text',
        default: '1000',
        description: 'Time in milliseconds to hide cursor after mouse inactivity, "no" to disable, "always" to hide.'
      },
      {
        name: 'cursor-autohide-fs-only',
        label: 'Autohide in Fullscreen only',
        type: 'toggle',
        default: 'no',
        description: 'Only hide the cursor when window is in fullscreen mode.'
      },
      {
        name: 'keep-open',
        label: 'Keep Window Open on End',
        type: 'select',
        options: ['no', 'yes', 'always'],
        default: 'no',
        description: 'Keep window open and paused instead of quitting when video playback finishes.'
      },
      {
        name: 'idle',
        label: 'Idle Mode',
        type: 'select',
        options: ['no', 'yes', 'once'],
        default: 'yes',
        description: 'Keep mpv running when no file is loaded for playback.'
      },
      {
        name: 'snap-window',
        label: 'Window Snapping',
        type: 'toggle',
        default: 'no',
        description: 'Snap the player window to screen boundaries on Windows/macOS.'
      },
      {
        name: 'panscan',
        label: 'Pan and Scan scale',
        type: 'slider',
        min: 0,
        max: 1,
        step: 0.05,
        default: 0,
        description: 'Crop top/bottom of widescreen video to fill 4:3 screen (0 = disabled, 1 = full).'
      }
    ]
  },
  {
    id: 'cache_network',
    title: '🌐 Cache & Network',
    description: 'Set buffering, demuxer readahead, cache sizes, and youtube-dl formatting.',
    settings: [
      {
        name: 'cache',
        label: 'Buffer Cache',
        type: 'select',
        options: ['no', 'yes', 'auto'],
        default: 'auto',
        description: 'Enable or disable buffering network stream cache.'
      },
      {
        name: 'cache-secs',
        label: 'Cache Duration Limit',
        type: 'slider',
        min: 1,
        max: 3600,
        step: 10,
        default: 600,
        description: 'Seconds of video to buffer ahead in cache memory.'
      },
      {
        name: 'demuxer-max-bytes',
        label: 'Max Cache Size Bytes',
        type: 'text',
        default: '150MiB',
        description: 'Max size in bytes to cache in memory (e.g. "150MiB", "512MiB").'
      },
      {
        name: 'demuxer-max-back-bytes',
        label: 'Backbuffer cache size',
        type: 'text',
        default: '50MiB',
        description: 'Size in bytes of past video to cache in memory for backwards seeking.'
      },
      {
        name: 'demuxer-readahead-secs',
        label: 'Demuxer Readahead',
        type: 'slider',
        min: 0,
        max: 120,
        step: 5,
        default: 10,
        description: 'Specify how far ahead the demuxer should read packets (seconds).'
      },
      {
        name: 'ytdl',
        label: 'Use youtube-dl / yt-dlp',
        type: 'toggle',
        default: 'yes',
        description: 'Enable integration with yt-dlp to stream online video links.'
      },
      {
        name: 'ytdl-format',
        label: 'yt-dlp Format query',
        type: 'text',
        default: 'bestvideo+bestaudio/best',
        description: 'Format selector string passed directly to yt-dlp.'
      },
      {
        name: 'ytdl-raw-options',
        label: 'yt-dlp Raw Options',
        type: 'text',
        default: '',
        description: 'Comma-separated options for yt-dlp command-line arguments (e.g., "proxy=http://127.0.0.1:8080").'
      },
      {
        name: 'stream-buffer-size',
        label: 'Stream Buffer Size',
        type: 'text',
        default: '128KiB',
        description: 'Size of buffer for network reading streams.'
      },
      {
        name: 'user-agent',
        label: 'User Agent String',
        type: 'text',
        default: '',
        description: 'Custom HTTP User-Agent string used for network connections.'
      }
    ]
  },
  {
    id: 'playback',
    title: '▶️ Playback',
    description: 'Control save state, loops, speeds, seek modes, and watch later directories.',
    settings: [
      {
        name: 'save-position-on-quit',
        label: 'Save Playback Position',
        type: 'toggle',
        default: 'no',
        description: 'Save current position and state on exit, and resume from this spot next launch.'
      },
      {
        name: 'loop',
        label: 'Loop Playlist',
        type: 'select',
        options: ['no', 'inf', 'force'],
        default: 'no',
        description: 'Loop through entire playlist files.'
      },
      {
        name: 'loop-file',
        label: 'Loop Current File',
        type: 'select',
        options: ['no', 'inf'],
        default: 'no',
        description: 'Repeat currently playing file infinitely.'
      },
      {
        name: 'loop-playlist',
        label: 'Loop Playlist Behavior',
        type: 'select',
        options: ['no', 'inf', 'force'],
        default: 'no',
        description: 'Loop mode for internal playlists.'
      },
      {
        name: 'speed',
        label: 'Playback Speed factor',
        type: 'slider',
        min: 0.25,
        max: 4.0,
        step: 0.05,
        default: 1.0,
        description: 'Multiplier for initial video playback speed (e.g. 1.0 = normal, 1.5 = fast).'
      },
      {
        name: 'pause',
        label: 'Start Paused',
        type: 'toggle',
        default: 'no',
        description: 'Load new files in a paused state instead of playing immediately.'
      },
      {
        name: 'hr-seek',
        label: 'Precise Seeking (HR-Seek)',
        type: 'select',
        options: ['no', 'absolute', 'yes', 'default'],
        default: 'default',
        description: 'Set precise (but slower) seeking behavior instead of keyframe snaps.'
      },
      {
        name: 'reset-on-next-file',
        label: 'Reset options next file',
        type: 'text',
        default: '',
        description: 'Reset settings to defaults when loading subsequent playlist items (comma-separated list).'
      },
      {
        name: 'write-filename-in-watch-later-config',
        label: 'Watch Later File tagging',
        type: 'toggle',
        default: 'no',
        description: 'Write filename metadata inside the resume state configs.'
      },
      {
        name: 'watch-later-directory',
        label: 'Resume States Directory',
        type: 'directory',
        default: '',
        description: 'Specify custom folder path where watch-later configurations are stored.'
      },
      {
        name: 'input-default-bindings',
        label: 'Enable MPV Key Bindings',
        type: 'toggle',
        default: 'yes',
        description: 'Enable native default input keybindings.'
      },
      {
        name: 'input-ar-delay',
        label: 'Keyboard Repeat Delay',
        type: 'slider',
        min: 0,
        max: 1000,
        step: 50,
        default: 200,
        description: 'Delay in ms before starting key repeat on held shortcut keys.'
      },
      {
        name: 'input-ar-rate',
        label: 'Keyboard Repeat Rate',
        type: 'slider',
        min: 0,
        max: 100,
        step: 5,
        default: 40,
        description: 'Repeat actions per second when holding down a shortcut key.'
      }
    ]
  },
  {
    id: 'misc',
    title: '⚙️ Misc',
    description: 'Miscellaneous settings, logging levels, colors, and styling rules.',
    settings: [
      {
        name: 'priority',
        label: 'Process Priority',
        type: 'select',
        options: ['normal', 'idle', 'below-normal', 'above-normal', 'high', 'realtime'],
        default: 'normal',
        description: 'Set player CPU process priority level (Windows/macOS/Linux scheduler).'
      },
      {
        name: 'msg-color',
        label: 'Color Console Output',
        type: 'toggle',
        default: 'yes',
        description: 'Apply colored text formatting to standard terminal stdout messages.'
      },
      {
        name: 'msg-level',
        label: 'Console Log Verbosity',
        type: 'text',
        default: 'all=status',
        description: 'Detailed terminal output level definitions (e.g. "all=status", "vo=debug").'
      },
      {
        name: 'config',
        label: 'Load Extra Config File',
        type: 'file',
        default: '',
        description: 'Path to another config file to load settings from.'
      }
    ]
  }
];

const PRESET_PROFILES = [
  {
    id: 'high-quality',
    name: '🎨 High Quality Rendering',
    description: 'Optimized for high-end GPUs. Enables ewa_lanczossharp scaling, high-quality rendering, and debanding.',
    settings: {
      'vo': 'gpu-next',
      'profile': 'high-quality',
      'scale': 'ewa_lanczossharp',
      'cscale': 'ewa_lanczossharp',
      'dscale': 'mitchell',
      'deband': 'yes',
      'hwdec': 'auto-safe',
      'correct-downscaling': 'yes',
      'sigmoid-upscaling': 'yes'
    }
  },
  {
    id: 'fast-performance',
    name: '⚡ Fast Performance',
    description: 'Optimized for low-end graphics card or battery saving. Standard bilinear scale and auto hardware decoding.',
    settings: {
      'vo': 'gpu',
      'profile': 'fast',
      'scale': 'bilinear',
      'cscale': 'bilinear',
      'dscale': 'bilinear',
      'deband': 'no',
      'hwdec': 'auto',
      'correct-downscaling': 'no',
      'sigmoid-upscaling': 'no'
    }
  },
  {
    id: 'anime-optimized',
    name: '🌸 Anime Optimized',
    description: 'Special settings for animated movies, preserving clean line arts and smooth color gradients.',
    settings: {
      'vo': 'gpu-next',
      'profile': 'high-quality',
      'deband': 'yes',
      'scale': 'spline36',
      'cscale': 'spline36',
      'dscale': 'mitchell',
      'correct-downscaling': 'yes',
      'sigmoid-upscaling': 'yes',
      'sub-ass-override': 'no'
    }
  },
  {
    id: 'low-latency',
    name: '🌐 Streaming & Low Latency',
    description: 'Buffer optimization for streaming web URLs, lowering latency and auto-reconnecting.',
    settings: {
      'cache': 'yes',
      'demuxer-readahead-secs': '20',
      'demuxer-max-bytes': '200MiB',
      'stream-buffer-size': '256KiB',
      'video-sync': 'audio',
      'keep-open': 'yes'
    }
  },
  {
    id: 'default',
    name: '🔄 Reset to Defaults',
    description: 'Restore mpv settings to safe clean player defaults.',
    settings: {
      'vo': 'gpu',
      'profile': 'default',
      'hwdec': 'no',
      'video-sync': 'audio',
      'interpolation': 'no',
      'deband': 'no',
      'scale': 'lanczos',
      'dscale': 'lanczos',
      'cscale': 'lanczos',
      'volume': '100',
      'volume-max': '130',
      'audio-channels': 'auto',
      'sub-auto': 'exact',
      'sub-font': 'sans-serif',
      'sub-font-size': '55',
      'sub-color': '#FFFFFFFF',
      'sub-border-color': '#000000FF',
      'sub-border-size': '3',
      'osd-level': '1',
      'osd-font-size': '55',
      'fullscreen': 'no',
      'border': 'yes',
      'ontop': 'no',
      'save-position-on-quit': 'no',
      'ytdl': 'yes'
    }
  }
];

const DEFAULT_KEYBINDINGS = [
  // Playback
  { key: 'SPACE', command: 'cycle pause', comment: 'Toggle pause/playback' },
  { key: 'PLAY', command: 'cycle pause', comment: 'Toggle pause/playback' },
  { key: 'PAUSE', command: 'cycle pause', comment: 'Toggle pause/playback' },
  { key: 'q', command: 'quit', comment: 'Quit' },
  { key: 'Q', command: 'quit-watch-later', comment: 'Quit and save position' },
  { key: 'ESC', command: 'set fullscreen no', comment: 'Exit fullscreen' },
  { key: 'f', command: 'cycle fullscreen', comment: 'Toggle fullscreen' },
  { key: 'f11', command: 'cycle fullscreen', comment: 'Toggle fullscreen' },
  { key: 'ENTER', command: 'cycle fullscreen', comment: 'Toggle fullscreen' },

  // Volume
  { key: 'UP', command: 'add volume 2', comment: 'Increase volume' },
  { key: 'DOWN', command: 'add volume -2', comment: 'Decrease volume' },
  { key: '9', command: 'add volume -2', comment: 'Decrease volume' },
  { key: '0', command: 'add volume 2', comment: 'Increase volume' },
  { key: 'm', command: 'cycle mute', comment: 'Toggle mute state' },
  { key: 'MUTE', command: 'cycle mute', comment: 'Toggle mute state' },

  // Seeking
  { key: 'LEFT', command: 'seek -5', comment: 'Seek 5 seconds backward' },
  { key: 'RIGHT', command: 'seek 5', comment: 'Seek 5 seconds forward' },
  { key: 'Shift+LEFT', command: 'seek -1 exact', comment: 'Seek 1 second backward (precise)' },
  { key: 'Shift+RIGHT', command: 'seek 1 exact', comment: 'Seek 1 second forward (precise)' },
  { key: 'Ctrl+LEFT', command: 'seek -60', comment: 'Seek 1 minute backward' },
  { key: 'Ctrl+RIGHT', command: 'seek 60', comment: 'Seek 1 minute forward' },
  { key: 'Shift+UP', command: 'seek 86 exact', comment: 'Seek 86s forward (skip anime opening)' },
  { key: 'Shift+DOWN', command: 'seek -86 exact', comment: 'Seek 86s backward' },

  // Playback Speed
  { key: '[', command: 'multiply speed 1/1.1', comment: 'Decrease speed by 10%' },
  { key: ']', command: 'multiply speed 1.1', comment: 'Increase speed by 10%' },
  { key: '{', command: 'multiply speed 0.5', comment: 'Half playback speed' },
  { key: '}', command: 'multiply speed 2.0', comment: 'Double playback speed' },
  { key: 'BS', command: 'set speed 1.0', comment: 'Reset playback speed' },

  // Audio / Subtitle cycle
  { key: 'j', command: 'cycle sub', comment: 'Cycle subtitle tracks forward' },
  { key: 'J', command: 'cycle sub down', comment: 'Cycle subtitle tracks backward' },
  { key: 'v', command: 'cycle sub-visibility', comment: 'Toggle subtitle visibility' },
  { key: 'a', command: 'cycle audio', comment: 'Cycle audio tracks' },
  { key: '_', command: 'cycle video', comment: 'Cycle video tracks' },
  { key: 'd', command: 'cycle deinterlace', comment: 'Toggle deinterlacing' },

  // Subtitle Adjustments
  { key: 'r', command: 'add sub-pos -1', comment: 'Move subtitles up' },
  { key: 'R', command: 'add sub-pos +1', comment: 'Move subtitles down' },
  { key: 't', command: 'add sub-pos +1', comment: 'Move subtitles down' },
  { key: 'z', command: 'add sub-delay -0.1', comment: 'Shift subtitles 100ms earlier' },
  { key: 'Z', command: 'add sub-delay +0.1', comment: 'Shift subtitles 100ms later' },
  { key: 'x', command: 'add sub-delay +0.1', comment: 'Shift subtitles 100ms later' },

  // Audio Delay
  { key: '9', command: 'add audio-delay -0.100', comment: 'Shift audio 100ms earlier' },
  { key: '0', command: 'add audio-delay 0.100', comment: 'Shift audio 100ms later' },

  // Screenshots
  { key: 's', command: 'screenshot', comment: 'Take screenshot with subtitles' },
  { key: 'S', command: 'screenshot video', comment: 'Take screenshot without subtitles' },
  { key: 'Ctrl+s', command: 'screenshot window', comment: 'Take screenshot of window dimensions' },
  { key: 'Alt+s', command: 'screenshot each-frame', comment: 'Toggle screenshot per-frame mode' },

  // Video adjustments
  { key: '1', command: 'add contrast -1', comment: 'Decrease contrast' },
  { key: '2', command: 'add contrast 1', comment: 'Increase contrast' },
  { key: '3', command: 'add brightness -1', comment: 'Decrease brightness' },
  { key: '4', command: 'add brightness 1', comment: 'Increase brightness' },
  { key: '5', command: 'add gamma -1', comment: 'Decrease gamma' },
  { key: '6', command: 'add gamma 1', comment: 'Increase gamma' },
  { key: '7', command: 'add saturation -1', comment: 'Decrease saturation' },
  { key: '8', command: 'add saturation 1', comment: 'Increase saturation' },

  // OSD and Stats
  { key: 'o', command: 'show-progress', comment: 'Show OSD seekbar progress' },
  { key: 'O', command: 'no-osd cycle-values osd-level 3 1', comment: 'Cycle OSD levels' },
  { key: 'p', command: 'show-progress', comment: 'Show OSD seekbar progress' },
  { key: 'i', command: 'script-binding stats/display-stats-toggle', comment: 'Toggle playback statistics info' },
  { key: 'I', command: 'script-binding stats/display-stats-toggle', comment: 'Toggle playback statistics info' },
  { key: '`', command: 'script-binding console/enable', comment: 'Open interactive console overlay' }
];

const CONTROLS_GUIDE = {
  basic: [
    {
      category: 'Playback Controls',
      items: [
        { key: 'SPACE', label: 'Play / Pause', desc: 'Toggle media playback state' },
        { key: 'q', label: 'Quit', desc: 'Close player instantly' },
        { key: 'Q', label: 'Quit & Save', desc: 'Close player and save resume position' }
      ]
    },
    {
      category: 'Volume & Audio',
      items: [
        { key: 'UP / 0', label: 'Volume Up', desc: 'Increase audio output level' },
        { key: 'DOWN / 9', label: 'Volume Down', desc: 'Decrease audio output level' },
        { key: 'm', label: 'Mute', desc: 'Toggle sound output' }
      ]
    },
    {
      category: 'Seeking (Navigation)',
      items: [
        { key: 'RIGHT', label: 'Seek 5s Forward', desc: 'Skip forward 5 seconds' },
        { key: 'LEFT', label: 'Seek 5s Backward', desc: 'Skip backward 5 seconds' },
        { key: 'Ctrl + RIGHT', label: 'Seek 1m Forward', desc: 'Skip forward 1 minute' },
        { key: 'Ctrl + LEFT', label: 'Seek 1m Backward', desc: 'Skip backward 1 minute' }
      ]
    },
    {
      category: 'Fullscreen & Window',
      items: [
        { key: 'f / Enter', label: 'Toggle Fullscreen', desc: 'Switch fullscreen on/off' },
        { key: 'ESC', label: 'Exit Fullscreen', desc: 'Leave fullscreen mode' },
        { key: 'T', label: 'Always on Top', desc: 'Keep player window floating' }
      ]
    },
    {
      category: 'Subtitles',
      items: [
        { key: 'j', label: 'Next Subtitle', desc: 'Cycle through subtitle tracks' },
        { key: 'v', label: 'Toggle Subtitles', desc: 'Show or hide subtitle text' },
        { key: 'a', label: 'Next Audio', desc: 'Cycle through audio tracks' }
      ]
    }
  ],
  advanced: [
    {
      category: 'Playback Speed',
      items: [
        { key: ']', label: 'Speed up 10%', desc: 'Play faster by 1.1x factor' },
        { key: '[', label: 'Slow down 10%', desc: 'Play slower by 0.9x factor' },
        { key: '}', label: 'Double Speed', desc: 'Set playback speed to 2.0x' },
        { key: '{', label: 'Half Speed', desc: 'Set playback speed to 0.5x' },
        { key: 'Backspace', label: 'Reset Speed', desc: 'Restore normal 1.0x speed' }
      ]
    },
    {
      category: 'Audio & Subtitle Sync',
      items: [
        { key: 'z / x', label: 'Subtitle Delay', desc: 'Shift subtitles early/late by 100ms' },
        { key: 'r / t', label: 'Subtitle Position', desc: 'Shift subtitle text height up or down' },
        { key: '9 / 0', label: 'Audio Delay', desc: 'Shift audio early/late by 100ms' }
      ]
    },
    {
      category: 'Screenshots',
      items: [
        { key: 's', label: 'Take Screenshot', desc: 'Capture video frame with subtitles' },
        { key: 'S', label: 'Video Screenshot', desc: 'Capture clean frame without subtitles' },
        { key: 'Ctrl + s', label: 'Window Screenshot', desc: 'Capture player window dimensions' }
      ]
    },
    {
      category: 'Video Adjustments',
      items: [
        { key: '1 / 2', label: 'Contrast', desc: 'Decrease or increase video contrast' },
        { key: '3 / 4', label: 'Brightness', desc: 'Decrease or increase video brightness' },
        { key: '5 / 6', label: 'Gamma', desc: 'Decrease or increase video gamma' },
        { key: '7 / 8', label: 'Saturation', desc: 'Decrease or increase video color saturation' }
      ]
    },
    {
      category: 'Player Stats & Console',
      items: [
        { key: 'i / I', label: 'Toggle Statistics', desc: 'Toggle system performance stats overlay' },
        { key: 'o / p', label: 'Show Progress', desc: 'Temporarily display playback seek bar' },
        { key: 'O', label: 'OSD Level', desc: 'Toggle information overlay depth' },
        { key: '` (grave)', label: 'Console Overlay', desc: 'Open interactive mpv Lua command console' }
      ]
    }
  ]
};

module.exports = { SETTINGS_CATEGORIES, PRESET_PROFILES, DEFAULT_KEYBINDINGS, CONTROLS_GUIDE };
