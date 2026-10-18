/* /tech/<รหัสร้าน>/… — การ์ดแชร์ลิงก์เป็นชื่อร้าน รูป และความถนัดจริง (ดู lib/share-meta.mjs) */
import {preview} from '../../lib/share-meta.mjs';
export const onRequestGet=ctx=>preview(ctx,'tech');
