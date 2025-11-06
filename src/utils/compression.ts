/**
 * 数据压缩工具
 * 使用LZ-string算法进行数据压缩，减少localStorage存储空间
 */

// 简单的LZ压缩算法实现
class LZString {
  private static keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  
  static compressToBase64(input: string): string {
    if (input === null || input === undefined) return "";
    const res = this._compress(input, 6, (a: number) => this.keyStrBase64.charAt(a));
    switch (res.length % 4) {
      case 0: return res;
      case 1: return res + "===";
      case 2: return res + "==";
      case 3: return res + "=";
      default: return res;
    }
  }

  static decompressFromBase64(input: string): string {
    if (input === null || input === undefined) return "";
    if (input === "") return null as any;
    return this._decompress(input.length, 32, (index: number) => {
      const char = this.keyStrBase64.indexOf(input.charAt(index));
      return char < 0 ? null : char;
    });
  }

  private static _compress(uncompressed: string, bitsPerChar: number, getCharFromInt: (a: number) => string): string {
    if (uncompressed === null) return "";
    
    let i: number, value: number;
    const context_dictionary: { [key: string]: number } = {};
    const context_dictionaryToCreate: { [key: string]: boolean } = {};
    let context_c = "";
    let context_wc = "";
    let context_w = "";
    let context_enlargeIn = 2;
    let context_dictSize = 3;
    let context_numBits = 2;
    const context_data: number[] = [];
    let context_data_val = 0;
    let context_data_position = 0;

    for (let ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 8; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i = 0; i < context_numBits; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i = 0; i < 16; i++) {
              context_data_val = (context_data_val << 1) | (value & 1);
              if (context_data_position === bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn === 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }

    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 8; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i = 0; i < 16; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn === 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }

    value = 2;
    for (i = 0; i < context_numBits; i++) {
      context_data_val = (context_data_val << 1) | (value & 1);
      if (context_data_position === bitsPerChar - 1) {
        context_data_position = 0;
        context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }

    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position === bitsPerChar - 1) {
        context_data.push(getCharFromInt(context_data_val).charCodeAt(0));
        break;
      } else {
        context_data_position++;
      }
    }
    return String.fromCharCode(...context_data);
  }

  private static _decompress(length: number, resetValue: number, getNextValue: (index: number) => number | null): string {
    const dictionary: string[] = [];
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;
    let entry = "";
    const result: string[] = [];
    let i: number;
    let w: string;
    let bits: number, resb: number, maxpower: number, power: number;
    let c: string;
    const data = { val: getNextValue(0) || 0, position: resetValue, index: 1 };

    for (i = 0; i < 3; i += 1) {
      dictionary[i] = String.fromCharCode(i);
    }

    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++) || 0;
      }
      bits |= (resb > 0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (bits) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2, 8);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++) || 0;
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2, 16);
        power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++) || 0;
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 2:
        return "";
      default:
        c = "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
      if (data.index > length) {
        return "";
      }

      bits = 0;
      maxpower = Math.pow(2, numBits);
      power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++) || 0;
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++) || 0;
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }

          dictionary[dictSize++] = String.fromCharCode(bits);
          bits = dictSize - 1;
          enlargeIn--;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++) || 0;
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          bits = dictSize - 1;
          enlargeIn--;
          break;
        case 2:
          return result.join('');
      }

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[bits]) {
        entry = dictionary[bits];
      } else {
        if (bits === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return "";
        }
      }
      result.push(entry);

      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;

      w = entry;

      if (enlargeIn === 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  }
}

/**
 * 压缩数据并存储到localStorage
 */
export function setCompressedItem(key: string, value: any): void {
  try {
    console.log('Compressing and storing data for key:', key);
    
    // 验证输入
    if (!key) {
      throw new Error('Storage key cannot be empty');
    }
    
    if (value === undefined) {
      throw new Error('Cannot store undefined value');
    }
    
    // 检查localStorage可用性
    if (typeof Storage === 'undefined') {
      throw new Error('localStorage is not supported');
    }
    
    const jsonString = JSON.stringify(value);
    console.log('Original data size:', jsonString.length, 'bytes');
    
    // 检查数据大小
    if (jsonString.length > 2 * 1024 * 1024) { // 2MB
      console.warn('Large data detected, compression may take time');
    }
    
    const compressed = LZString.compressToBase64(jsonString);
    console.log('Compressed data size:', compressed.length, 'bytes');
    
    // 计算压缩率
    const compressionRatio = ((jsonString.length - compressed.length) / jsonString.length * 100).toFixed(1);
    console.log('Compression ratio:', compressionRatio + '%');
    
    localStorage.setItem(key, compressed);
    console.log('Successfully stored compressed data');
  } catch (error) {
    console.error('Failed to compress and store data:', error);
    
    // 降级到普通存储
    try {
      console.log('Falling back to uncompressed storage');
      const jsonString = JSON.stringify(value);
      localStorage.setItem(key, jsonString);
      console.log('Successfully stored uncompressed data');
    } catch (fallbackError) {
      console.error('Fallback storage also failed:', fallbackError);
      throw new Error(`Storage failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
    }
  }
}

/**
 * 从localStorage读取并解压数据
 */
export function getCompressedItem<T>(key: string): T | null {
  try {
    const compressed = localStorage.getItem(key);
    if (!compressed) return null;
    
    // 尝试解压
    try {
      const decompressed = LZString.decompressFromBase64(compressed);
      if (decompressed) {
        return JSON.parse(decompressed);
      }
    } catch {
      // 如果解压失败，尝试直接解析（可能是未压缩的数据）
      return JSON.parse(compressed);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to decompress data:', error);
    return null;
  }
}

/**
 * 从localStorage删除压缩数据
 */
export function removeCompressedItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove compressed data:', error);
  }
}

/**
 * 获取存储大小信息
 */
export function getStorageInfo(): {
  used: number;
  total: number;
  available: number;
  compressionRatio?: number;
} {
  let used = 0;
  const total = 5 * 1024 * 1024; // 5MB (typical localStorage limit)
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }
  
  return {
    used,
    total,
    available: total - used
  };
}

/**
 * 清理过期数据
 */
export function cleanupExpiredData(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  const keysToRemove: string[] = [];
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key) && key.startsWith('cache_')) {
      try {
        const data = getCompressedItem<{ timestamp: number; data: any }>(key);
        if (data && now - data.timestamp > maxAge) {
          keysToRemove.push(key);
        }
      } catch {
        // 如果解析失败，也删除这个键
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}