import CryptoJS from 'crypto-js';
import axios from 'axios';

const AES_KEY = CryptoJS.enc.Utf8.parse('638udh3829162018');
const AES_IV = CryptoJS.enc.Utf8.parse('fedcba9876543210');

export const API_BASE = 'https://dishaonlineclassesapi.classx.co.in';

export function decrypt(enc: string): string {
  if (!enc) return '';
  try {
    // Appx encryption split by :
    const dataPart = enc.split(':')[0];
    const bytes = CryptoJS.AES.decrypt(dataPart, AES_KEY, {
      iv: AES_IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

export function decodeBase64(str: string): string {
  try {
    return CryptoJS.enc.Base64.parse(str).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    return str;
  }
}

async function proxyFetch(url: string, method: string = 'GET', data: any = null, headers: any = {}) {
  const response = await axios.post('/api/proxy', {
    url,
    method,
    data,
    headers,
  });
  
  // The proxy returns response.data directly
  let result = response.data;
  
  // Handle cases where API returns text that looks like JSON or has prefixes
  if (typeof result === 'string') {
    try {
      // Look for the first { or [ to extract JSON
      const start = result.indexOf('{');
      if (start !== -1) {
        result = JSON.parse(result.substring(start));
      }
    } catch (e) {
      console.warn('Failed to parse JSON from string:', result);
    }
  }
  
  return result;
}

export const AppxService = {
  login: async (email: string, password: string) => {
    const data = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
    return proxyFetch(`${API_BASE}/post/userLogin`, 'POST', data, {
      'Auth-Key': 'appxapi',
      'User-Id': '-2',
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  },

  getPurchases: async (userid: string, token: string) => {
    return proxyFetch(`${API_BASE}/get/get_all_purchases?userid=${userid}&item_type=10`, 'GET', null, {
      'Authorization': token,
      'Client-Service': 'Appx',
      'Auth-Key': 'appxapi',
      'User-ID': userid,
    });
  },

  getCourseFolders: async (courseId: string, parentId: string, token: string, userid: string) => {
    return proxyFetch(`${API_BASE}/get/folder_contentsv2?course_id=${courseId}&parent_id=${parentId}`, 'GET', null, {
      'Authorization': token,
      'Client-Service': 'Appx',
      'Auth-Key': 'appxapi',
      'User-ID': userid,
    });
  },

  getVideoDetails: async (courseId: string, videoId: string, token: string, userid: string) => {
    return proxyFetch(`${API_BASE}/get/fetchVideoDetailsById?course_id=${courseId}&video_id=${videoId}&ytflag=0&folder_wise_course=1`, 'GET', null, {
      'Authorization': token,
      'Client-Service': 'Appx',
      'Auth-Key': 'appxapi',
      'User-ID': userid,
    });
  },
  
  // Alternative course listing if purchases doesn't work
  getMyCourses: async (userid: string, token: string) => {
    return proxyFetch(`${API_BASE}/get/mycoursev2?userid=${userid}`, 'GET', null, {
      'Authorization': token,
      'Client-Service': 'Appx',
      'Auth-Key': 'appxapi',
      'User-ID': userid,
    });
  }
};
