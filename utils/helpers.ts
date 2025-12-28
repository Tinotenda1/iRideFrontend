// utils/helpers.ts
export const isBase64Image = (str: string): boolean => {
  if (typeof str !== 'string') return false;
  return str.startsWith('data:image/') && str.includes('base64,');
};

export const getBase64ImageSize = (base64String: string): number => {
  // Base64 string is about 1.37x the original binary size
  const base64Data = base64String.split(',')[1] || base64String;
  return Math.floor((base64Data.length * 3) / 4);
};