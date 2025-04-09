import axios from 'axios';
import { API_BASE_URL } from './logs.service';
import { z } from 'zod';

const GetGuardrailsSchema = z.array(z.coerce.string());

export const getGuardrails = async () => {
  try {
    const { data } = await axios.get(`${API_BASE_URL + 'guardrails'}`);
    return GetGuardrailsSchema.parse(data);
  } catch (error) {
    console.error('Error fetching guardrails:', error);
    alert('Error fetching guardrails');
    return [];
  }
};

export const submitGuardrails = async (guardrails: string[]) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return guardrails;
};
