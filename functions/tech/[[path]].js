/* /tech/<รหัสร้าน> — หน้าร้านสาธารณะ (ค้นเจอใน Google) หรือหน้าแอปสำหรับคนที่ล็อกอินอยู่ (ดู lib/public-pages.mjs) */
import {handle} from '../../lib/public-pages.mjs';
export const onRequestGet=ctx=>handle(ctx,'tech');
