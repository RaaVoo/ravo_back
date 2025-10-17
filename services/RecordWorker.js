// backend/service/RecordWorker.js
// ------------------------------------------------------------
// ffmpeg 기반 HLS→MP4 인코딩 워커
// - start(record_no, sourceUrl): ffmpeg 무한 인코딩 시작
// - stopAndUpload(record_no): ffmpeg 정상 종료(q) 후 썸네일/URL/실제길이 반환
// - grabNow(sourceUrl, seconds, nameHint): 폴백(짧게 캡처) + 실제길이(ffprobe)
// - debugSessions(): 현재 살아있는 세션의 record_no 목록(디버그용)
// ------------------------------------------------------------
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';

// s3 업로드 관련 코드 추가
import { uploadFile } from '../utils/s3.js';

const execFileP = promisify(execFile);

const FFMPEG      = process.env.FFMPEG_PATH   || 'ffmpeg';
const FFPROBE     = process.env.FFPROBE_PATH  || 'ffprobe';
const MEDIA_TMP   = process.env.MEDIA_TMP     || path.join(process.cwd(), 'media-tmp');
const PUBLIC_BASE = (process.env.PUBLIC_BASE  || 'http://localhost:8080').replace(/\/+$/, '');
const HAS_S3     = !!(process.env.AWS_REGION && process.env.S3_BUCKET);   // s3 업로드 관련 코드 추가

fs.mkdirSync(MEDIA_TMP, { recursive: true });


console.log('[ffmpeg paths]', { FFMPEG, FFPROBE, MEDIA_TMP });

// 메모리 세션 맵: key(record_no 문자열) -> { child, outFile, thumbFile }
const sessions = new Map();
const keyOf = (n) => String(n); // ✅ 문자열 키 통일 (숫자/문자열 혼용 버그 방지)

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// 공통 실행 헬퍼 (stderr 수집)
function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args);
    let stderr = '';
    p.stderr.on('data', (d) => (stderr += d.toString()));
    p.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${bin} exited with code ${code}\n${stderr}`));
    });
  });
}

// 입력(HLS) → 표준 MP4 인코딩 옵션(웹 호환성)
function inputArgs(sourceUrl) {
  return [
    '-i', sourceUrl,
    '-map', '0:v:0',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'baseline',
    '-level', '3.1',
    '-preset', 'veryfast',
    '-r', '30',
    '-movflags', '+faststart',
    // 필요시 해상도 고정:
    // '-vf', 'scale=1280:-2',
  ];
}

async function makeThumbnail(inFile, outFile) {
  // 1초 지점 프레임으로 썸네일 생성
  await run(FFMPEG, ['-y', '-ss', '1', '-i', inFile, '-frames:v', '1', '-q:v', '2', outFile]);
}

// ✅ ffprobe로 실제 길이(초) 측정
async function probeDurationSec(filePath) {
  try {
    const { stdout } = await execFileP(FFPROBE, [
      '-v','error',
      '-show_entries','format=duration',
      '-of','default=noprint_wrappers=1:nokey=1',
      filePath
    ]);
    const sec = Math.round(parseFloat(stdout.trim()));
    return Number.isFinite(sec) ? sec : 0;
  } catch {
    return 0;
  }
}

/** 녹화 시작: ffmpeg 무한 인코딩 (정지는 stopAndUpload에서 'q') */
export async function start({ record_no, sourceUrl }) {
  if (!sourceUrl) throw new Error('sourceUrl required');

  const key = keyOf(record_no);
  if (sessions.has(key)) throw new Error('이미 녹화중입니다.');

  const base = `${nowStamp()}_cam_${key}`;
  const outFile = path.join(MEDIA_TMP, `${base}.mp4`);
  const thumbFile = path.join(MEDIA_TMP, `${base}_thumb.jpg`);

  const args = [...inputArgs(sourceUrl), '-y', outFile];
  const child = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });

  sessions.set(key, { child, outFile, thumbFile });
  return { outFile };
}

/** 녹화 정지 + 썸네일 + 실제 duration */
export async function stopAndUpload(record_no) {
  const key = keyOf(record_no);
  const s = sessions.get(key);
  if (!s) throw new Error('녹화 세션 없음');

  const { child, outFile, thumbFile } = s;

  // ffmpeg 정상 종료 신호
  try { child.stdin.write('q'); } catch {}

  // close 이벤트까지 대기
  await new Promise((resolve) => child.on('close', resolve));

  // 썸네일(실패 무시)
  try { await makeThumbnail(outFile, thumbFile); } catch {}

  // ✅ 파일에서 실제 길이 측정
  const durationSec = await probeDurationSec(outFile);

  // 세션 정리
  sessions.delete(key);

  /* 여기 잠깐 주석
  const url = `${PUBLIC_BASE}/media/${path.basename(outFile)}`;
  const thumbUrl = fs.existsSync(thumbFile) ? `${PUBLIC_BASE}/media/${path.basename(thumbFile)}` : null;

  return { s3Url: url, s3Thumb: thumbUrl, durationSec };
  여기까지 */

  // 아래 코드 잠깐 추가 (251017)
  let videoUrl, thumbUrl;
  if (HAS_S3) {
    const baseName = path.basename(outFile);         // 예: 20251017_cam_37.mp4
    const keyVid   = `videos/${baseName}`;
    const keyTh    = thumbFile && fs.existsSync(thumbFile)
                      ? `thumbs/${path.basename(thumbFile)}`
                      : null;
    //const { url: vUrl } = await uploadFile(outFile, keyVid, 'video/mp4');
    const { url: vUrl } = await uploadFile(outFile, `homecam/${keyVid}`, 'video/mp4'); 
    videoUrl = vUrl;
    if (keyTh) {
      const { url: tUrl } = await uploadFile(thumbFile, keyTh, 'image/jpeg');
      thumbUrl = tUrl;
    }
    // (선택) 임시파일 정리
    try { fs.unlinkSync(outFile); } catch {}
    try { if (thumbFile) fs.unlinkSync(thumbFile); } catch {}
  } else {
    // S3 미설정일 때는 기존 로컬 경로
    videoUrl = `${PUBLIC_BASE}/media/${path.basename(outFile)}`;
    thumbUrl = fs.existsSync(thumbFile) ? `${PUBLIC_BASE}/media/${path.basename(thumbFile)}` : null;
 }
 return { s3Url: videoUrl, s3Thumb: thumbUrl, durationSec, s3Key: `homecam/${keyVid}` };
 // 여기까지 잠깐 추가 (251017)
}

/** 폴백: 지금 HLS에서 N초 캡처 → 실제 길이(ffprobe) 측정 */
export async function grabNow(sourceUrl, seconds = 8, nameHint = 'grab') {
  const base = `${nowStamp()}_${nameHint}`;
  const outName = `${base}.mp4`;
  const outFile = path.join(MEDIA_TMP, outName);

  const args = [...inputArgs(sourceUrl), '-t', String(seconds), '-y', outFile];
  await run(FFMPEG, args);

  const thumbName = outName.replace(/\.mp4$/i, '_thumb.jpg');
  const thumbFile = path.join(MEDIA_TMP, thumbName);
  try { await makeThumbnail(outFile, thumbFile); } catch {}

  /*
  const url = `${PUBLIC_BASE}/media/${path.basename(outFile)}`;
  const thumbUrl = fs.existsSync(thumbFile) ? `${PUBLIC_BASE}/media/${path.basename(thumbFile)}` : null;

  // ✅ 캡처 파일 길이 측정
  const durationSec = await probeDurationSec(outFile);

  return { s3Url: url, s3Thumb: thumbUrl, durationSec };
  */

  // 아래 코드 잠깐 추가
  let videoUrl, thumbUrl;
  const durationSec = await probeDurationSec(outFile);
  if (HAS_S3) {
    const baseName = path.basename(outFile);
    const keyVid   = `videos/${baseName}`;
    const keyTh    = thumbFile && fs.existsSync(thumbFile)
                        ? `thumbs/${path.basename(thumbFile)}`
                        : null;
    const { url: vUrl } = await uploadFile(outFile, keyVid, 'video/mp4');
    videoUrl = vUrl;
    if (keyTh) {
      const { url: tUrl } = await uploadFile(thumbFile, keyTh, 'image/jpeg');
      thumbUrl = tUrl;
    }
    try { fs.unlinkSync(outFile); } catch {}
    try { if (thumbFile) fs.unlinkSync(thumbFile); } catch {}
  } else {
    videoUrl = `${PUBLIC_BASE}/media/${path.basename(outFile)}`;
    thumbUrl = fs.existsSync(thumbFile) ? `${PUBLIC_BASE}/media/${path.basename(thumbFile)}` : null;
  }
  return { s3Url: videoUrl, s3Thumb: thumbUrl, durationSec };
  // 여기까지
}

// 🔎 디버그: 현재 살아있는 ffmpeg 세션 목록 반환
export function debugSessions() {
  return Array.from(sessions.keys());
}

// ✅ default export (라우트에서 편하게 import 가능)
export default { start, stopAndUpload, grabNow, debugSessions };