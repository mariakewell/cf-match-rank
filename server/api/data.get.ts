import { defineEventHandler } from 'h3';
import { loadState } from '~/server/utils/state';

/**
 * 返回系统完整数据快照（设置、组别、球员、比赛）。
 * 前台与后台页面都依赖该接口进行初始化渲染。
 */
export default defineEventHandler(async (event) => {
  return loadState(event);
});
