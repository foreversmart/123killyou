export function soundSettingFor(text: string): boolean | undefined {
  const command = text.replace(/[\s\p{P}]/gu, '').replace(/^(?:请你|请|帮我|麻烦你|麻烦)/u, '');
  if (['取消静音', '打开声音', '开启声音'].includes(command)) return true;
  if (['关闭声音', '静音'].includes(command)) return false;
  return undefined;
}
