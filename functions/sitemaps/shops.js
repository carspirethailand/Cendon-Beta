/* /sitemaps/shops — แผนผังเว็บสดของหน้าร้าน บริการ และหมวดช่าง (robots.txt ชี้มาที่นี่) */
import {sitemap} from '../../lib/public-pages.mjs';
export const onRequestGet=ctx=>sitemap(ctx);
