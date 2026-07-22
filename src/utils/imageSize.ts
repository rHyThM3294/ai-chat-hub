export function estimateRawBytesFromDataUrl(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  const base64 = commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
  const paddingMatch = base64.match(/=*$/);
  const padding = paddingMatch ? paddingMatch[0].length : 0;
  return Math.max(0, Math.ceil((base64.length * 3) / 4) - padding);
}
