import { defineEventHandler } from 'h3';
import { loadState } from '~/server/utils/state';

export default defineEventHandler(async (event) => {
  return loadState(event);
});
