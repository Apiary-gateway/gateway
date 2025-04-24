import axios from 'axios';
import { API_BASE_URL } from './logs.service';
import { presignedUrlSchema, PresignedUrl } from '../types/config.types';

export const getPresignedUrlGet = async (): Promise<string> => {
  try {
    const response = await axios.get<PresignedUrl>(`${API_BASE_URL + 'config?method=get'}`);
    const parsed = presignedUrlSchema.parse(response.data)
    return parsed.url;
  } catch (error) {
    console.error('Error fetching presignedUrl:', error);
    alert('Error fetching presignedUrl');
    return '';
  }
};

export const getPresignedUrlPut = async (): Promise<string> => {
    try {
      const response = await axios.get<typeof presignedUrlSchema>(`${API_BASE_URL + 'config?method=put'}`);
      const parsed = presignedUrlSchema.parse(response.data)
      return parsed.url;
    } catch (error) {
      console.error('Error fetching presignedUrl:', error);
      alert('Error fetching presignedUrl');
      return '';
    }
};

export const getConfig = async () => {
    try {
        const url = await getPresignedUrlGet();
        const res = await axios.get(url);
        return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    } catch (error) {
        console.error('Error fetching config:', error);
        alert('Error fetching config');
    }
}

export const submitConfig = async (configJson: string) => {
    try {
        const url = await getPresignedUrlPut();
        await axios.put(url, configJson, {
            headers: {
                'Content-Type': 'application/json',
            }
        })
    } catch (error) {
        console.error('Error fetching config:', error);
        alert('Error fetching config');
    }
}