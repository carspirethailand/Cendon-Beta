/* /category/<หมวด> — รวมร้านที่ผ่านการตรวจในหมวดนั้น (หน้าสาธารณะ) หรือหน้าแอปสำหรับคนที่ล็อกอินอยู่ (ดู lib/public-pages.mjs) */
import {handle} from '../../lib/public-pages.mjs';
export const onRequestGet=ctx=>handle(ctx,'category');
