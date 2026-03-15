export function estimateTokens(text:string){
    if(!text) return 0;
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
  // 粗略估算：
  // 中文 1 字 ≈ 1 token
  // 英文/數字/符號約 4 字 ≈ 1 token
    return chineseChars + Math.ceil(otherChars / 4);
}