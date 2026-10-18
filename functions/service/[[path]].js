/* /service/<รหัสบริการ>/… — การ์ดแชร์ลิงก์เป็นชื่อบริการ ราคาเริ่ม และรูป (ดู lib/share-meta.mjs) */
import {preview} from '../../lib/share-meta.mjs';
export const onRequestGet=ctx=>preview(ctx,'service');
